/**
 * GET /api/sync-from-local
 *
 * Envía a Turso los pendientes de la base local (pending_pushes).
 * Misma idea que en la app de escritorio: al arrancar la webapp se llama este
 * endpoint para que los altas/actualizaciones hechos en local (y pendientes de
 * envío) se suban a Turso antes de cargar el listado.
 *
 * Solo tiene efecto si LOCAL_DATABASE_URL está definido (ej. file:...)
 * y apunta a la misma SQLite que usa catalogo_manager. En producción
 * (Vercel) normalmente no está definido y se responde 200 sin hacer nada.
 */

import { createClient } from '@libsql/client';
import { executeQuery } from './lib/turso.js';
import { SYNC_TABLE_CONFIG } from './lib/sync-config.js';

function getLocalDbUrl() {
  const url = process.env.LOCAL_DATABASE_URL;
  if (url && typeof url === 'string' && url.startsWith('file:')) return url;
  return null;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      return res.status(200).json({});
    }
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const localUrl = getLocalDbUrl();
    if (!localUrl) {
      return res.status(200).json({ synced: false, message: 'No local DB configured', pushed: 0 });
    }

    const localDb = createClient({ url: localUrl });

    let pending;
    try {
      const result = await localDb.execute(
        'SELECT table_name, record_id FROM pending_pushes ORDER BY id'
      );
      pending = (result.rows || []).map((row) => {
        if (Array.isArray(row)) return { table_name: row[0], record_id: row[1] };
        return { table_name: row.table_name, record_id: row.record_id };
      });
    } catch (e) {
      if (e && /no such table|pending_pushes/.test(String(e.message || e))) {
        return res.status(200).json({ synced: false, message: 'No pending_pushes table', pushed: 0 });
      }
      throw e;
    }

    if (pending.length === 0) {
      return res.status(200).json({ synced: true, pushed: 0 });
    }

    const config = SYNC_TABLE_CONFIG;
    let pushed = 0;

    for (const { table_name, record_id } of pending) {
      const tableConfig = config[table_name];
      if (!tableConfig) continue;

      const { id_field, fields } = tableConfig;
      const columns = [id_field, ...fields];
      const placeholders = columns.map(() => '?').join(', ');
      const selectSql = `SELECT ${columns.join(', ')} FROM ${table_name} WHERE ${id_field} = ?`;

      let row;
      try {
        const selectResult = await localDb.execute(selectSql, [record_id]);
        if (!selectResult.rows || selectResult.rows.length === 0) {
          await deletePending(localDb, table_name, record_id);
          continue;
        }
        row = selectResult.rows[0];
      } catch (err) {
        continue;
      }

      const values = Array.isArray(row) ? [...row] : columns.map((c) => row[c]);

      const insertSql = `INSERT INTO ${table_name} (${columns.join(', ')}) VALUES (${placeholders})`;
      const updateParts = fields.map((f) => `${f} = ?`).join(', ');
      const updateSql = `UPDATE ${table_name} SET ${updateParts} WHERE ${id_field} = ?`;
      const updateParams = [...values.slice(1), values[0]];

      try {
        await executeQuery(insertSql, values);
      } catch (err) {
        const msg = String(err?.message || err);
        if (/UNIQUE constraint|already exists|unique/.test(msg)) {
          try {
            await executeQuery(updateSql, updateParams);
          } catch {
            continue;
          }
        } else {
          continue;
        }
      }

      await deletePending(localDb, table_name, record_id);
      pushed += 1;
    }

    return res.status(200).json({ synced: true, pushed });
  } catch (error) {
    console.error('Error in /api/sync-from-local:', error);
    return res.status(500).json({
      error: 'Error al sincronizar desde local',
      message: error?.message || String(error),
    });
  }
}

async function deletePending(localDb, table_name, record_id) {
  try {
    await localDb.execute(
      'DELETE FROM pending_pushes WHERE table_name = ? AND record_id = ?',
      [table_name, String(record_id)]
    );
  } catch {
    // ignorar
  }
}
