/**
 * Crea la tabla core_temas en Turso (y opcionalmente en la base local).
 * core_temas = desglose de un disco (título) en temas/canciones.
 *
 * Uso: node scripts/init-core-temas.js
 * Requiere: .env.local con TURSO_DATABASE_URL y TURSO_AUTH_TOKEN.
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env.local');

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error('No se encuentra .env.local');
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

loadEnv();

const { executeQuery } = await import('../api/lib/turso.js');

const CREATE_TEMAS = `
  CREATE TABLE IF NOT EXISTS core_temas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codiTitulo_id INTEGER NOT NULL REFERENCES core_titulos(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL DEFAULT 1,
    nombreTema TEXT NOT NULL DEFAULT '',
    duracion TEXT,
    enlace TEXT,
    created TEXT DEFAULT (datetime('now')),
    updated TEXT DEFAULT (datetime('now')),
    UNIQUE(codiTitulo_id, numero)
  )
`;

/** Añade columnas si la tabla ya existía sin ellas (migraciones). */
async function ensureColumns() {
  try {
    const rows = await executeQuery('PRAGMA table_info(core_temas)');
    const names = (r) => (r.name || r.NAME || '').toLowerCase();
    const hasNumero = Array.isArray(rows) && rows.some((r) => names(r) === 'numero');
    const hasNombreTema = Array.isArray(rows) && rows.some((r) => names(r) === 'nombretema');
    const hasEnlace = Array.isArray(rows) && rows.some((r) => names(r) === 'enlace');
    if (rows.length > 0) {
      if (!hasNumero) {
        console.log('Añadiendo columna numero a core_temas...');
        await executeQuery('ALTER TABLE core_temas ADD COLUMN numero INTEGER NOT NULL DEFAULT 1');
        console.log('Columna numero añadida.');
      }
      if (!hasNombreTema) {
        console.log('Añadiendo columna nombreTema a core_temas...');
        await executeQuery('ALTER TABLE core_temas ADD COLUMN nombreTema TEXT NOT NULL DEFAULT \'\'');
        console.log('Columna nombreTema añadida.');
      }
      if (!hasEnlace) {
        console.log('Añadiendo columna enlace a core_temas...');
        await executeQuery('ALTER TABLE core_temas ADD COLUMN enlace TEXT');
        console.log('Columna enlace añadida.');
      }
    }
  } catch (e) {
    console.warn('No se pudo comprobar/añadir columnas:', e.message);
  }
}

async function main() {
  console.log('Creando tabla core_temas en Turso...');
  await executeQuery(CREATE_TEMAS);
  console.log('Tabla core_temas creada o ya existía.');
  await ensureColumns();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
