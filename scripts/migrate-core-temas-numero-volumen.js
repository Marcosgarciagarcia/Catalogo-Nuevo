/**
 * Añade core_temas.numeroVolumen (INTEGER NOT NULL DEFAULT 1) en Turso y BD local.
 * Semántica: volumen físico (DVD/CD) al que pertenece cada pista/capítulo.
 * duracion sigue siendo opcional (TEXT NULL).
 *
 * Uso: node --use-system-ca scripts/migrate-core-temas-numero-volumen.js
 * Requiere: .env.local con TURSO_* y/o LOCAL_DATABASE_URL
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
  const fromEnv = (process.env.LOCAL_DATABASE_URL || '').trim().replace(/^["']|["']$/g, '');
  if (fromEnv) {
    if (fromEnv.startsWith('file:')) return fromEnv;
    if (/^[a-zA-Z]:[/\\]/.test(fromEnv) || fromEnv.startsWith('/')) {
      return `file:${fromEnv.replace(/\\/g, '/')}`;
    }
  }
  const configPath = path.join(rootDir, '..', 'catalogo_manager', 'config.py');
  if (!existsSync(configPath)) return null;
  const content = readFileSync(configPath, 'utf8');
  const match =
    content.match(/CATALOGO_LOCAL_DB_PATH['"]\s*,\s*['"]([^'"]+)['"]/) ||
    content.match(/'path':\s*r?['"]([^'"]+)['"]/);
  if (!match) return null;
  return `file:${match[1].trim().replace(/\\/g, '/')}`;
}

const ADD_SQL =
  'ALTER TABLE core_temas ADD COLUMN numeroVolumen INTEGER NOT NULL DEFAULT 1';

function colNamesFromPragma(rows) {
  return (Array.isArray(rows) ? rows : []).map((r) =>
    String(r.name || r.NAME || '').toLowerCase(),
  );
}

async function migrateTurso() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) {
    console.log('[Turso] TURSO_DATABASE_URL o TURSO_AUTH_TOKEN no definidos. Se omite.');
    return false;
  }
  const { executeQuery } = await import('../api/lib/turso.js');
  console.log('[Turso] Comprobando core_temas...');
  let rows;
  try {
    rows = await executeQuery('PRAGMA table_info(core_temas)');
  } catch (e) {
    console.error('[Turso] core_temas no existe o no es accesible:', e.message);
    throw e;
  }
  const names = colNamesFromPragma(rows);
  if (names.includes('numerovolumen')) {
    console.log('[Turso] Columna numeroVolumen ya existe. Se omite.');
    return true;
  }
  console.log('[Turso] Añadiendo numeroVolumen...');
  await executeQuery(ADD_SQL);
  console.log('[Turso] Columna numeroVolumen añadida (DEFAULT 1).');
  return true;
}

async function migrateLocal() {
  const dbUrl = getLocalDbUrl();
  if (!dbUrl) {
    console.log('[Local] LOCAL_DATABASE_URL no definida / BD no encontrada. Se omite.');
    return false;
  }
  console.log('[Local] Conectando:', dbUrl);
  const client = createClient({ url: dbUrl });
  const info = await client.execute('PRAGMA table_info(core_temas)');
  const names = (info.rows || []).map((r) => String(r.name || '').toLowerCase());
  if (names.length === 0) {
    console.error('[Local] Tabla core_temas no existe.');
    return false;
  }
  if (names.includes('numerovolumen')) {
    console.log('[Local] Columna numeroVolumen ya existe. Se omite.');
    return true;
  }
  console.log('[Local] Añadiendo numeroVolumen...');
  await client.execute(ADD_SQL);
  console.log('[Local] Columna numeroVolumen añadida (DEFAULT 1).');
  return true;
}

loadEnv();

async function main() {
  const turso = await migrateTurso();
  const local = await migrateLocal();
  if (!turso && !local) {
    console.error('No se migró ninguna BD. Configura TURSO_* y/o LOCAL_DATABASE_URL.');
    process.exit(1);
  }
  console.log('Migración numeroVolumen completada.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
