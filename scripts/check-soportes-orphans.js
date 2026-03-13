/**
 * Lista registros de core_soportes cuyo codiTipoSoporte_id NO existe en core_tipos_coleccion.
 * Uso: node scripts/check-soportes-orphans.js   (desde la raíz del proyecto Catalogo)
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

const ORPHANS_QUERY = `
  SELECT s.id, s.descriSoporte, s.codiTipoSoporte_id, s.created, s.updated
  FROM core_soportes s
  LEFT JOIN core_tipos_coleccion c ON c.id = s.codiTipoSoporte_id
  WHERE c.id IS NULL AND s.codiTipoSoporte_id IS NOT NULL
  ORDER BY s.id
`;

async function checkTurso() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) return;
  const { executeQuery } = await import('../api/lib/turso.js');
  const rows = await executeQuery(ORPHANS_QUERY);
  console.log('\n--- TURSO ---');
  if (!rows || rows.length === 0) {
    console.log('No hay registros en core_soportes sin correspondencia en core_tipos_coleccion.');
    return;
  }
  console.log('Registros en core_soportes con codiTipoSoporte_id inexistente en core_tipos_coleccion:\n');
  console.log('  id   | codiTipoSoporte_id | descriSoporte');
  console.log('  -----+--------------------+----------------------------------------');
  for (const r of rows) {
    const id = String(r.id ?? '').padEnd(5);
    const fk = String(r.codiTipoSoporte_id ?? '').padEnd(18);
    const desc = (r.descriSoporte ?? '').slice(0, 38);
    console.log('  ', id, '|', fk, '|', desc);
  }
  console.log('\nTotal:', rows.length, 'registro(s).');
}

async function checkLocal() {
  const url = getLocalDbUrl();
  if (!url || !url.startsWith('file:')) return;
  const db = createClient({ url });
  const result = await db.execute(ORPHANS_QUERY);
  const rows = (result.rows || []).map((row) => {
    const cols = result.columns || [];
    const obj = {};
    row.forEach((val, i) => { obj[cols[i] || i] = val; });
    return obj;
  });
  console.log('\n--- LOCAL ---');
  if (rows.length === 0) {
    console.log('No hay registros en core_soportes sin correspondencia en core_tipos_coleccion.');
    return;
  }
  console.log('Registros en core_soportes con codiTipoSoporte_id inexistente en core_tipos_coleccion:\n');
  console.log('  id   | codiTipoSoporte_id | descriSoporte');
  console.log('  -----+--------------------+----------------------------------------');
  for (const r of rows) {
    const id = String(r.id ?? '').padEnd(5);
    const fk = String(r.codiTipoSoporte_id ?? '').padEnd(18);
    const desc = (String(r.descriSoporte ?? '').slice(0, 38));
    console.log('  ', id, '|', fk, '|', desc);
  }
  console.log('\nTotal:', rows.length, 'registro(s).');
}

async function listTursoIds() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) return;
  const { executeQuery } = await import('../api/lib/turso.js');
  const tipos = await executeQuery('SELECT id, slug, nombre FROM core_tipos_coleccion ORDER BY id');
  const soportes = await executeQuery('SELECT id, descriSoporte, codiTipoSoporte_id FROM core_soportes ORDER BY id');
  console.log('\n--- TURSO: Referencia ---');
  console.log('core_tipos_coleccion.id existentes:', tipos.map((t) => t.id).join(', ') || '(ninguno)');
  console.log('core_soportes (id, descriSoporte, codiTipoSoporte_id):');
  for (const s of soportes) {
    const ok = tipos.some((t) => Number(t.id) === Number(s.codiTipoSoporte_id));
    console.log('  ', s.id, '|', s.descriSoporte, '| codiTipoSoporte_id =', s.codiTipoSoporte_id, ok ? '✓' : '✗ NO EXISTE');
  }
}

async function main() {
  loadEnv();
  await checkTurso();
  await checkLocal();
  await listTursoIds();
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
