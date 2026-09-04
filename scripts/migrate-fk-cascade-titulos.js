/**
 * Recrea FKs hijas de core_titulos con ON DELETE CASCADE en Turso y BD local.
 * Tablas: core_temas, core_titulosleidos.
 *
 * Uso: node --use-system-ca scripts/migrate-fk-cascade-titulos.js
 */
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env.local');

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error('No se encuentra .env.local');
    process.exit(1);
  }
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

function rowObj(row) {
  if (!row) return null;
  if (Array.isArray(row)) return row;
  const o = {};
  for (const [k, v] of Object.entries(row)) o[k] = v;
  return o;
}

async function getFkOnDelete(execute, table, fromCol, parentTable) {
  const fks = (await execute(`PRAGMA foreign_key_list(${table})`)) || [];
  for (const raw of fks) {
    const f = rowObj(raw);
    const from = String(f.from || f[3] || '');
    const parent = String(f.table || f[2] || '');
    if (from === fromCol && parent === parentTable) {
      return String(f.on_delete || f[6] || 'NO ACTION').toUpperCase();
    }
  }
  return null;
}

async function tableExists(execute, name) {
  const rows = await execute(
    `SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name=? LIMIT 1`,
    [name],
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function columnNames(execute, table) {
  const rows = (await execute(`PRAGMA table_info(${table})`)) || [];
  return rows.map((r) => {
    const o = rowObj(r);
    return String(o.name || o[1] || '');
  });
}

/**
 * Recrea core_temas con CASCADE en codiTitulo_id.
 * Mantiene columnas usadas por la app; duracion pasa a TEXT NULL (opcional).
 */
async function migrateTemas(execute, runBatch) {
  const exists = await tableExists(execute, 'core_temas');
  if (!exists) {
    console.log('  core_temas no existe; se omite.');
    return false;
  }
  const onDel = await getFkOnDelete(execute, 'core_temas', 'codiTitulo_id', 'core_titulos');
  if (onDel === 'CASCADE') {
    console.log('  core_temas: ON DELETE CASCADE ya presente.');
    return false;
  }
  console.log(`  core_temas: on_delete actual=${onDel || 'ninguna'} → recreando con CASCADE…`);

  const cols = await columnNames(execute, 'core_temas');
  const has = (c) => cols.includes(c);

  const selectParts = [
    'id',
    has('duracion') ? 'duracion' : 'NULL AS duracion',
    has('enlaceWiki') ? 'enlaceWiki' : 'NULL AS enlaceWiki',
    has('created') ? 'created' : `datetime('now') AS created`,
    has('updated') ? 'updated' : `datetime('now') AS updated`,
    has('codiAutor_id') ? 'codiAutor_id' : 'NULL AS codiAutor_id',
    has('codiTitulo_id') ? 'codiTitulo_id' : 'NULL AS codiTitulo_id',
    has('numero') ? 'numero' : '1 AS numero',
    has('nombreTema') ? 'nombreTema' : (has('Tema') ? 'Tema AS nombreTema' : `'' AS nombreTema`),
    has('enlace') ? 'enlace' : 'NULL AS enlace',
    has('numeroVolumen') ? 'numeroVolumen' : '1 AS numeroVolumen',
  ];

  const stmts = [
    { sql: 'PRAGMA foreign_keys=OFF' },
    {
      sql: `
        CREATE TABLE core_temas__cascade (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          duracion TEXT,
          enlaceWiki TEXT,
          created TEXT NOT NULL,
          updated TEXT NOT NULL,
          codiAutor_id INTEGER REFERENCES core_autores(id),
          codiTitulo_id INTEGER REFERENCES core_titulos(id) ON DELETE CASCADE,
          numero INTEGER NOT NULL DEFAULT 1,
          nombreTema TEXT NOT NULL DEFAULT '',
          enlace TEXT,
          numeroVolumen INTEGER NOT NULL DEFAULT 1
        )
      `,
    },
    {
      sql: `
        INSERT INTO core_temas__cascade (
          id, duracion, enlaceWiki, created, updated, codiAutor_id, codiTitulo_id,
          numero, nombreTema, enlace, numeroVolumen
        )
        SELECT ${selectParts.join(', ')}
        FROM core_temas
      `,
    },
    { sql: 'DROP TABLE core_temas' },
    { sql: 'ALTER TABLE core_temas__cascade RENAME TO core_temas' },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_core_temas_codiTitulo_numero
            ON core_temas(codiTitulo_id, numero)`,
    },
    { sql: 'PRAGMA foreign_keys=ON' },
  ];

  await runBatch(stmts);
  const after = await getFkOnDelete(execute, 'core_temas', 'codiTitulo_id', 'core_titulos');
  console.log(`  core_temas: on_delete ahora=${after}`);
  return true;
}

async function migrateTitulosLeidos(execute, runBatch) {
  const exists = await tableExists(execute, 'core_titulosleidos');
  if (!exists) {
    console.log('  core_titulosleidos no existe; se omite.');
    return false;
  }
  const onDel = await getFkOnDelete(execute, 'core_titulosleidos', 'codiTitulo_id', 'core_titulos');
  if (onDel === 'CASCADE') {
    console.log('  core_titulosleidos: ON DELETE CASCADE ya presente.');
    return false;
  }
  console.log(`  core_titulosleidos: on_delete actual=${onDel || 'ninguna'} → recreando con CASCADE…`);

  const stmts = [
    { sql: 'PRAGMA foreign_keys=OFF' },
    {
      sql: `
        CREATE TABLE core_titulosleidos__cascade (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          leido INTEGER NOT NULL DEFAULT 0,
          codiTitulo_id INTEGER REFERENCES core_titulos(id) ON DELETE CASCADE,
          codiUsuario_id INTEGER REFERENCES auth_user(id)
        )
      `,
    },
    {
      sql: `
        INSERT INTO core_titulosleidos__cascade (id, leido, codiTitulo_id, codiUsuario_id)
        SELECT id, leido, codiTitulo_id, codiUsuario_id FROM core_titulosleidos
      `,
    },
    { sql: 'DROP TABLE core_titulosleidos' },
    { sql: 'ALTER TABLE core_titulosleidos__cascade RENAME TO core_titulosleidos' },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_core_titulosleidos_titulo
            ON core_titulosleidos(codiTitulo_id)`,
    },
    { sql: 'PRAGMA foreign_keys=ON' },
  ];

  await runBatch(stmts);
  const after = await getFkOnDelete(execute, 'core_titulosleidos', 'codiTitulo_id', 'core_titulos');
  console.log(`  core_titulosleidos: on_delete ahora=${after}`);
  return true;
}

async function migrateWithLibsql(url, label) {
  console.log(`\n[${label}] ${url.replace(/:[^/@]+@/, ':****@')}`);
  const client = createClient({
    url,
    authToken: label === 'Turso' ? process.env.TURSO_AUTH_TOKEN : undefined,
  });

  const execute = async (sql, args = []) => {
    const r = await client.execute({ sql, args });
    return r.rows.map((row) => {
      if (Array.isArray(row)) return row;
      const o = {};
      for (const [k, v] of Object.entries(row)) o[k] = v;
      return o;
    });
  };

  const runBatch = async (stmts) => {
    // Ejecutar en secuencia (SQLite local); Turso también tolera esto
    for (const s of stmts) {
      await client.execute(s.sql);
    }
  };

  await migrateTemas(execute, runBatch);
  await migrateTitulosLeidos(execute, runBatch);
}

async function migrateTursoHttp() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.log('\n[Turso] Sin credenciales; se omite.');
    return;
  }
  // Preferir cliente HTTP de Turso vía @libsql/client con URL remota
  await migrateWithLibsql(process.env.TURSO_DATABASE_URL, 'Turso');
}

async function main() {
  const localUrl = getLocalUrl();
  if (localUrl) {
    try {
      await migrateWithLibsql(localUrl, 'Local');
    } catch (e) {
      console.error('[Local] Error:', e.message || e);
      console.error('Si la BD está bloqueada, cierra catalogo_manager / npm run local e inténtalo de nuevo.');
      throw e;
    }
  } else {
    console.log('[Local] LOCAL_DATABASE_URL no definida; se omite.');
  }

  try {
    await migrateTursoHttp();
  } catch (e) {
    console.error('[Turso] Error:', e.message || e);
    throw e;
  }

  console.log('\nMigración CASCADE completada.');
}

main().catch(() => process.exit(1));
