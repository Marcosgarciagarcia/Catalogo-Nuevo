/**
 * Migración: recrea core_soportes con FK codiTipoSoporte_id → core_tipos_coleccion(id).
 * Sustituye la antigua relación con core_tiposSoporte por core_tipos_coleccion.
 * Se ejecuta en Turso y en la base local (la misma que usa catalogo_manager).
 *
 * Uso: node scripts/migrate-core-soportes-fk.js   (desde la raíz del proyecto Catalogo)
 * Requiere: .env.local con TURSO_* y/o LOCAL_DATABASE_URL (o config de catalogo_manager para local).
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
    console.error('No se encuentra .env.local en la raíz del proyecto.');
    process.exit(1);
  }
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    }
  }
}

function getLocalDbUrl() {
  const fromEnv = process.env.LOCAL_DATABASE_URL;
  if (fromEnv && fromEnv.startsWith('file:')) return fromEnv;

  const configPath = path.join(rootDir, '..', 'catalogo_manager', 'config.py');
  if (!existsSync(configPath)) return null;

  const content = readFileSync(configPath, 'utf8');
  const match = content.match(/'path':\s*r?['"]([^'"]+)['"]/);
  if (!match) return null;

  const winPath = match[1].trim();
  return 'file:' + winPath.replace(/\\/g, '/');
}

const CREATE_NEW = `
  CREATE TABLE core_soportes_new (
    id INTEGER PRIMARY KEY,
    descriSoporte TEXT,
    imagenSoporte TEXT,
    codiTipoSoporte_id INTEGER REFERENCES core_tipos_coleccion(id),
    created TEXT,
    updated TEXT
  )
`.trim();

const INSERT_SELECT = `
  INSERT INTO core_soportes_new (id, descriSoporte, imagenSoporte, codiTipoSoporte_id, created, updated)
  SELECT id, descriSoporte, imagenSoporte, codiTipoSoporte_id, created, updated
  FROM core_soportes
`.trim();

const DROP_OLD = 'DROP TABLE core_soportes';
const RENAME_NEW = 'ALTER TABLE core_soportes_new RENAME TO core_soportes';

async function runMigrationTurso() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) return false;

  const { executePipeline } = await import('../api/lib/turso.js');
  const { executeQuery } = await import('../api/lib/turso.js');
  console.log('[Turso] Comprobando que existe core_tipos_coleccion...');
  try {
    await executeQuery("SELECT 1 FROM core_tipos_coleccion LIMIT 1");
  } catch (e) {
    console.error('[Turso] La tabla core_tipos_coleccion no existe. Ejecuta antes: node scripts/init-tipos-coleccion.js');
    throw e;
  }

  // Avisar si hay codiTipoSoporte_id que no existen en core_tipos_coleccion (datos huérfanos)
  try {
    const orphans = await executeQuery(`
      SELECT DISTINCT s.codiTipoSoporte_id
      FROM core_soportes s
      LEFT JOIN core_tipos_coleccion c ON c.id = s.codiTipoSoporte_id
      WHERE c.id IS NULL AND s.codiTipoSoporte_id IS NOT NULL
    `);
    if (orphans && orphans.length > 0) {
      console.warn('[Turso] Aviso: hay', orphans.length, 'valor(es) de codiTipoSoporte_id sin correspondencia en core_tipos_coleccion:', orphans.map((o) => o.codiTipoSoporte_id).join(', '));
      console.warn('[Turso] La migración crea la tabla sin restricción FK. Corrige esos IDs si quieres exigir la relación después.');
    }
  } catch (_) {
    // Ignorar si la consulta falla (ej. tabla sin esa columna)
  }

  console.log('[Turso] Recreando core_soportes con FK a core_tipos_coleccion...');
  // PRAGMA debe ejecutarse antes de BEGIN (SQLite no permite cambiarlo dentro de transacción).
  // noWrap: enviamos PRAGMA, BEGIN, ..., COMMIT en ese orden.
  await executePipeline(
    [
      { sql: 'PRAGMA foreign_keys = OFF' },
      { sql: 'BEGIN' },
      { sql: CREATE_NEW },
      { sql: INSERT_SELECT },
      { sql: DROP_OLD },
      { sql: RENAME_NEW },
      { sql: 'COMMIT' },
      { sql: 'PRAGMA foreign_keys = ON' },
    ],
    { noWrap: true }
  );
  console.log('[Turso] Migración aplicada correctamente.');
  return true;
}

async function runMigrationLocal() {
  const url = getLocalDbUrl();
  if (!url || !url.startsWith('file:')) return false;

  const db = createClient({ url });

  console.log('[Local] Comprobando que existe core_tipos_coleccion...');
  try {
    await db.execute("SELECT 1 FROM core_tipos_coleccion LIMIT 1");
  } catch (e) {
    console.error('[Local] La tabla core_tipos_coleccion no existe. Ejecuta antes: node scripts/init-tipos-coleccion.js');
    throw e;
  }

  console.log('[Local] Recreando core_soportes con FK a core_tipos_coleccion...');
  await db.execute('PRAGMA foreign_keys = OFF');
  await db.execute('BEGIN');
  try {
    await db.execute('DROP TABLE IF EXISTS core_soportes_new');
    await db.execute(CREATE_NEW);
    await db.execute(INSERT_SELECT);
    await db.execute(DROP_OLD);
    await db.execute(RENAME_NEW);
    await db.execute('COMMIT');
  } catch (e) {
    await db.execute('ROLLBACK');
    await db.execute('PRAGMA foreign_keys = ON');
    throw e;
  }
  await db.execute('PRAGMA foreign_keys = ON');
  console.log('[Local] Migración aplicada correctamente.');
  return true;
}

async function main() {
  loadEnv();
  let ok = false;

  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    await runMigrationTurso();
    ok = true;
  } else {
    console.log('TURSO_DATABASE_URL o TURSO_AUTH_TOKEN no definidos. Se omite Turso.');
  }

  const localUrl = getLocalDbUrl();
  if (localUrl) {
    await runMigrationLocal();
    ok = true;
  } else {
    console.log('Base local no encontrada (LOCAL_DATABASE_URL o ../catalogo_manager/config.py). Se omite.');
  }

  if (!ok) {
    console.error('Define al menos Turso (TURSO_*) o local (LOCAL_DATABASE_URL=file:...) en .env.local');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
