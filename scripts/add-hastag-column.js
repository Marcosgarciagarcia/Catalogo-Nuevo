/**
 * Añade la columna hastag (TEXT) a core_titulos en Turso y en la base local.
 * Elimina la dependencia de tablas core_hastags / core_tituloshastags para títulos.
 * Uso: node scripts/add-hastag-column.js   (desde la raíz, con .env.local)
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
    console.error('No se encuentra .env.local.');
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
  return 'file:' + match[1].trim().replace(/\\/g, '/');
}

const ADD_COLUMN = 'ALTER TABLE core_titulos ADD COLUMN hastag TEXT';

async function addColumnTurso() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) return false;
  const { executeQuery } = await import('../api/lib/turso.js');
  try {
    const info = await executeQuery("SELECT * FROM pragma_table_info('core_titulos')");
    if (info.some((r) => r.name === 'hastag')) {
      console.log('[Turso] Columna hastag ya existe.');
      return true;
    }
    await executeQuery(ADD_COLUMN);
    console.log('[Turso] Columna hastag añadida.');
    return true;
  } catch (e) {
    if (/duplicate column|already exists/i.test(String(e.message))) {
      console.log('[Turso] Columna hastag ya existe.');
      return true;
    }
    throw e;
  }
}

async function addColumnLocal() {
  const url = getLocalDbUrl();
  if (!url) return false;
  const db = createClient({ url });
  try {
    const r = await db.execute("SELECT * FROM pragma_table_info('core_titulos')");
    const rows = r.rows || [];
    const hasCol = rows.some((row) => {
      const name = Array.isArray(row) ? row[1] : row.name;
      return name === 'hastag';
    });
    if (hasCol) {
      console.log('[Local] Columna hastag ya existe.');
      return true;
    }
    await db.execute(ADD_COLUMN);
    console.log('[Local] Columna hastag añadida.');
    return true;
  } catch (e) {
    if (/duplicate column|already exists/i.test(String(e.message))) {
      console.log('[Local] Columna hastag ya existe.');
      return true;
    }
    throw e;
  }
}

loadEnv();

(async () => {
  let ok = false;
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    await addColumnTurso();
    ok = true;
  }
  if (getLocalDbUrl()) {
    await addColumnLocal();
    ok = true;
  }
  if (!ok) console.error('Configura Turso o local en .env.local');
})();
