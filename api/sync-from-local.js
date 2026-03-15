/**
 * GET /api/sync-from-local
 *
 * Envía a Turso los pendientes de la base local en este orden:
 * 1. pending_deletes: solo borrados (DELETE en Turso).
 * 2. pending_pushes: solo altas/actualizaciones (INSERT o UPDATE en Turso).
 *
 * Así se evita que un registro borrado en local se reinserte en Turso porque
 * "no existía" allí; los deletes se aplican primero vía pending_deletes.
 *
 * Solo tiene efecto si LOCAL_DATABASE_URL está definido (file:...) y apunta
 * a la misma SQLite que usa catalogo_manager. En producción (Vercel) no se
 * suele definir y se responde 200 sin hacer nada.
 */

import { createClient } from '@libsql/client';
import { executeQuery } from './lib/turso.js';
import { SYNC_TABLE_CONFIG } from './lib/sync-config.js';

/** Índice de codiEstante_id en el array de columnas de core_titulos (id + fields) */
const CORE_TITULOS_CODIESTANTE_INDEX = 1 + SYNC_TABLE_CONFIG.core_titulos.fields.indexOf('codiEstante_id');

/**
 * Normaliza codiEstante_id para Turso: si la BD local tiene 106 (número) y en Turso
 * el estante es "0106" (TEXT), la FK falla. Resolvemos buscando en Turso el codiEstante
 * que coincida (exacto o por valor numérico) y usamos ese valor.
 */
async function normalizeCodiEstanteIdForTurso(val) {
  if (val == null || val === '') return null;
  try {
    const asNum = Number(val);
    const asStr = String(val).trim();
    const rows = await executeQuery(
      `SELECT codiEstante FROM core_ubicaciones_sub WHERE codiEstante = ? OR codiEstante = ? OR (CAST(codiEstante AS INTEGER) = ? AND ? IS NOT NULL) LIMIT 1`,
      [val, asStr, asNum, asNum]
    );
    if (rows?.[0]?.codiEstante != null) return rows[0].codiEstante;
  } catch (_) {}
  return val;
}

function getLocalDbUrl() {
  const url = process.env.LOCAL_DATABASE_URL;
  if (url && typeof url === 'string' && url.startsWith('file:')) return url;
  return null;
}

/** Orden para aplicar deletes: primero tablas dependientes (ej. core_titulos), luego FKs */
const DELETE_ORDER = [
  'auth_user',
  'core_titulos',
  'core_ubicaciones_sub',
  'core_ubicaciones',
  'core_soportes',
  'core_generos',
  'core_editoriales',
  'core_autores',
  'core_tipos_coleccion',
];

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
      return res.status(200).json({ synced: false, message: 'No local DB configured', pushed: 0, deleted: 0 });
    }

    const localDb = createClient({ url: localUrl });
    const config = SYNC_TABLE_CONFIG;

    // 1. Procesar pending_deletes (solo borrados)
    let deleted = 0;
    try {
      const delResult = await localDb.execute(
        'SELECT id, table_name, record_id FROM pending_deletes ORDER BY id'
      );
      const pendingDeletes = (delResult.rows || []).map((row) => {
        if (Array.isArray(row)) return { id: row[0], table_name: row[1], record_id: row[2] };
        return { id: row.id, table_name: row.table_name, record_id: row.record_id };
      });

      const priority = (t) => {
        const i = DELETE_ORDER.indexOf(t);
        return i === -1 ? 999 : i;
      };
      pendingDeletes.sort((a, b) => priority(a.table_name) - priority(b.table_name));

      for (const { id: pendingId, table_name, record_id } of pendingDeletes) {
        const tableConfig = config[table_name];
        if (!tableConfig) continue;
        const { id_field } = tableConfig;
        try {
          await executeQuery(`DELETE FROM ${table_name} WHERE ${id_field} = ?`, [record_id]);
          await localDb.execute('DELETE FROM pending_deletes WHERE id = ?', [pendingId]);
          deleted += 1;
        } catch (err) {
          // No limpiar de pending_deletes; se reintentará en la próxima sync
        }
      }
    } catch (e) {
      if (e && /no such table|pending_deletes/.test(String(e.message || e))) {
        // Tabla inexistente: seguir con pending_pushes
      } else {
        throw e;
      }
    }

    // 2. Procesar pending_pushes (solo INSERT / UPDATE)
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
        return res.status(200).json({ synced: true, pushed: 0, deleted });
      }
      throw e;
    }

    if (pending.length === 0) {
      return res.status(200).json({ synced: true, pushed: 0, deleted });
    }
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

      // Evitar error de FK en Turso: codiEstante_id puede ser TEXT "0106" en Turso y número 106 en local
      if (table_name === 'core_titulos' && values[CORE_TITULOS_CODIESTANTE_INDEX] != null) {
        values[CORE_TITULOS_CODIESTANTE_INDEX] = await normalizeCodiEstanteIdForTurso(values[CORE_TITULOS_CODIESTANTE_INDEX]);
      }

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

    return res.status(200).json({ synced: true, pushed, deleted });
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
