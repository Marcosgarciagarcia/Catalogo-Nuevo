/**
 * Crea la tabla core_tipos_coleccion e inserta el tipo "Libros" en ambas BDs:
 * - Turso: TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (.env.local)
 * - Local: la misma SQLite que usa catalogo_manager (app de escritorio).
 *   Se usa LOCAL_DATABASE_URL (file:...) si está definido; si no, se intenta
 *   leer la ruta de ../catalogo_manager/config.py (DATABASE_CONFIG['local']['path']).
 * Uso: node scripts/init-tipos-coleccion.js   (desde la raíz del proyecto Catalogo)
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

/** Resuelve la ruta de la base local: env LOCAL_DATABASE_URL o config de catalogo_manager */
function getLocalDbUrl() {
  const fromEnv = process.env.LOCAL_DATABASE_URL;
  if (fromEnv && fromEnv.startsWith('file:')) return fromEnv;

  const configPath = path.join(rootDir, '..', 'catalogo_manager', 'config.py');
  if (!existsSync(configPath)) return null;

  const content = readFileSync(configPath, 'utf8');
  const match = content.match(/'path':\s*r?['"]([^'"]+)['"]/);
  if (!match) return null;

  const winPath = match[1].trim();
  const fileUrl = 'file:' + winPath.replace(/\\/g, '/');
  return fileUrl;
}

loadEnv();

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS core_tipos_coleccion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1,
    descripcion TEXT
  )
`;

const INSERT_LIBROS = `
  INSERT INTO core_tipos_coleccion (slug, nombre, orden, activo, descripcion)
  VALUES (?, ?, ?, 1, ?)
`;

const CHECK_LIBROS = "SELECT id FROM core_tipos_coleccion WHERE slug = 'libros' LIMIT 1";

async function runInitTurso() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) return false;

  const { executeQuery } = await import('../api/lib/turso.js');
  console.log('[Turso] Creando tabla core_tipos_coleccion...');
  await executeQuery(CREATE_TABLE);
  console.log('[Turso] Tabla creada (o ya existía).');

  const existing = await executeQuery(CHECK_LIBROS);
  if (existing?.length > 0) {
    console.log("[Turso] Ya existe el tipo 'Libros'. No se inserta de nuevo.");
    return true;
  }

  await executeQuery(INSERT_LIBROS, ['libros', 'Libros', 1, 'Catálogo de libros de casa']);
  console.log("[Turso] Tipo 'Libros' insertado.");
  return true;
}

async function runInitLocal() {
  const url = getLocalDbUrl();
  if (!url || !url.startsWith('file:')) return false;

  const db = createClient({ url });
  console.log('[Local] Creando tabla core_tipos_coleccion...');
  await db.execute(CREATE_TABLE);
  console.log('[Local] Tabla creada (o ya existía).');

  const existing = await db.execute(CHECK_LIBROS);
  if (existing?.rows?.length > 0) {
    console.log("[Local] Ya existe el tipo 'Libros'. No se inserta de nuevo.");
    return true;
  }

  await db.execute(INSERT_LIBROS, ['libros', 'Libros', 1, 'Catálogo de libros de casa']);
  console.log("[Local] Tipo 'Libros' insertado.");
  return true;
}

async function main() {
  let ok = false;

  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    await runInitTurso();
    ok = true;
  } else {
    console.log('TURSO_DATABASE_URL o TURSO_AUTH_TOKEN no definidos. Se omite Turso.');
  }

  const localUrl = getLocalDbUrl();
  if (localUrl) {
    await runInitLocal();
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
