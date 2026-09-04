/**
 * Audita FKs e integridad de tablas hijas de core_titulos (local + Turso).
 * Uso: node --use-system-ca scripts/audit-fk-titulos-cascade.js
 */
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env.local');

function loadEnv() {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (t && !t.startsWith('#')) {
      const eq = t.indexOf('=');
      if (eq > 0) {
        process.env[t.slice(0, eq).trim()] =
          t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      }
    }
  }
}

function getLocalUrl() {
  const fromEnv = (process.env.LOCAL_DATABASE_URL || '').trim().replace(/^["']|["']$/g, '');
  if (!fromEnv) return null;
  return fromEnv.startsWith('file:') ? fromEnv : `file:${fromEnv.replace(/\\/g, '/')}`;
}

loadEnv();

const CHILD_CANDIDATES = [
  'core_temas',
  'core_titulosleidos',
  'core_titulos_hastags',
  'core_tituloshastags',
  'core_wishlist',
];

async function auditClient(label, execute) {
  console.log(`\n========== ${label} ==========`);
  try {
    const fkOn = await execute('PRAGMA foreign_keys');
    console.log('PRAGMA foreign_keys:', fkOn?.[0] || fkOn);
  } catch (e) {
    console.log('PRAGMA foreign_keys error:', e.message);
  }

  let tables = [];
  try {
    const rows = await execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'core_%' ORDER BY name",
    );
    tables = (rows || []).map((r) => r.name || r[0]);
    console.log('Tablas core_*:', tables.join(', '));
  } catch (e) {
    console.log('List tables error:', e.message);
  }

  for (const t of CHILD_CANDIDATES) {
    if (tables.length && !tables.includes(t)) continue;
    try {
      const ddl = await execute(
        `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`,
        [t],
      );
      const sql = ddl?.[0]?.sql || ddl?.[0]?.[0] || null;
      if (!sql && tables.length && !tables.includes(t)) continue;
      if (!sql) {
        // try anyway
      }
      console.log(`\n--- ${t} ---`);
      if (sql) console.log('DDL:', sql);
      const fks = await execute(`PRAGMA foreign_key_list(${t})`);
      console.log('foreign_key_list:', JSON.stringify(fks || [], null, 2));
    } catch (e) {
      if (!/no such table/i.test(e.message)) console.log(t, e.message);
    }
  }

  // Orphans for known children
  for (const t of ['core_temas', 'core_titulosleidos']) {
    if (tables.length && !tables.includes(t)) continue;
    try {
      const cols = await execute(`PRAGMA table_info(${t})`);
      const names = (cols || []).map((c) => String(c.name || c[1] || '').toLowerCase());
      const fkCol = names.includes('codititulo_id')
        ? 'codiTitulo_id'
        : names.find((n) => n.includes('titulo'));
      if (!fkCol) continue;
      const orphanSql = `
        SELECT COUNT(*) AS n FROM ${t} c
        LEFT JOIN core_titulos ti ON ti.id = c.${fkCol}
        WHERE ti.id IS NULL AND c.${fkCol} IS NOT NULL
      `;
      const n = (await execute(orphanSql))?.[0]?.n ?? 0;
      console.log(`Huérfanos ${t}.${fkCol}:`, n);
    } catch (e) {
      console.log(`Orphan check ${t}:`, e.message);
    }
  }
}

async function main() {
  const localUrl = getLocalUrl();
  if (localUrl) {
    const client = createClient({ url: localUrl });
    await auditClient('LOCAL', async (sql, args = []) => {
      const r = await client.execute({ sql, args });
      return r.rows.map((row) => {
        if (Array.isArray(row)) return row;
        const o = {};
        for (const [k, v] of Object.entries(row)) o[k] = v;
        return o;
      });
    });
  } else {
    console.log('LOCAL: no configurada');
  }

  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    const { executeQuery } = await import('../api/lib/turso.js');
    await auditClient('TURSO', async (sql, args = []) => executeQuery(sql, args));
  } else {
    console.log('TURSO: sin credenciales');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
