/**
 * Añade columnas MusicBrainz / catálogo de sello a core_titulos (Turso y/o SQLite local).
 * Uso: node scripts/migrate-core-titulos-musicbrainz.js
 * Requiere: .env.local con TURSO_DATABASE_URL y TURSO_AUTH_TOKEN (o ejecutar contra SQLite local adaptando import).
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

const COLUMNS = [
  { name: 'musicbrainz_release_mbid', sql: 'ALTER TABLE core_titulos ADD COLUMN musicbrainz_release_mbid TEXT' },
  { name: 'numero_catalogo_sello', sql: 'ALTER TABLE core_titulos ADD COLUMN numero_catalogo_sello TEXT' },
];

async function columnExists(table, colName) {
  const rows = await executeQuery(`PRAGMA table_info(${table})`);
  const names = (r) => (r.name || r.NAME || '').toLowerCase();
  return Array.isArray(rows) && rows.some((r) => names(r) === colName.toLowerCase());
}

async function main() {
  for (const { name, sql } of COLUMNS) {
    const exists = await columnExists('core_titulos', name);
    if (exists) {
      console.log(`Columna ${name} ya existe, se omite.`);
      continue;
    }
    console.log(`Añadiendo columna ${name}...`);
    await executeQuery(sql);
    console.log(`Columna ${name} añadida.`);
  }
  console.log('Migración core_titulos MusicBrainz completada.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
