/**
 * Desactiva tipos de colección duplicados (mismo nombre, distinto slug).
 * Conserva el preferido (libros / música / cine) y pone activo=0 en discoteca/video extras.
 *
 * Uso: node --use-system-ca scripts/deactivate-duplicate-tipos.js
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';
import { dedupeTiposColeccion, cleanSlug, cleanNombre } from '../api/lib/tipos-coleccion.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env.local');

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error('No se encuentra .env.local');
    process.exit(1);
  }
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    process.env[key] = value;
  }
}

function getLocalDbUrl() {
  const fromEnv = (process.env.LOCAL_DATABASE_URL || '').trim().replace(/^["']|["']$/g, '');
  if (fromEnv.startsWith('file:')) return fromEnv;
  if (/^[a-zA-Z]:[/\\]/.test(fromEnv) || fromEnv.startsWith('/')) {
    return `file:${fromEnv.replace(/\\/g, '/')}`;
  }
  return null;
}

loadEnv();

async function deactivateOnTurso() {
  const { executeQuery } = await import('../api/lib/turso.js');
  const rows = await executeQuery(
    'SELECT id, slug, nombre, orden, descripcion, activo FROM core_tipos_coleccion',
  );
  const active = (rows || []).filter((r) => Number(r.activo) === 1);
  const keep = new Set(dedupeTiposColeccion(active).map((t) => Number(t.id)));
  let n = 0;
  for (const r of active) {
    if (keep.has(Number(r.id))) continue;
    await executeQuery('UPDATE core_tipos_coleccion SET activo = 0 WHERE id = ?', [r.id]);
    console.log(`[Turso] Desactivado id=${r.id} slug="${cleanSlug(r.slug)}" nombre="${cleanNombre(r.nombre)}"`);
    n += 1;
  }
  // Limpiar tabs en slugs activos
  for (const r of active) {
    if (!keep.has(Number(r.id))) continue;
    const cleaned = cleanSlug(r.slug);
    if (cleaned !== r.slug) {
      await executeQuery('UPDATE core_tipos_coleccion SET slug = ? WHERE id = ?', [cleaned, r.id]);
      console.log(`[Turso] Slug limpiado id=${r.id}: "${r.slug}" → "${cleaned}"`);
    }
  }
  return n;
}

async function deactivateOnLocal() {
  const url = getLocalDbUrl();
  if (!url) {
    console.log('[Local] LOCAL_DATABASE_URL no definida. Se omite.');
    return 0;
  }
  const db = createClient({ url });
  const result = await db.execute('SELECT id, slug, nombre, orden, descripcion, activo FROM core_tipos_coleccion');
  const rows = (result.rows || []).map((row) => {
    if (Array.isArray(row)) {
      return { id: row[0], slug: row[1], nombre: row[2], orden: row[3], descripcion: row[4], activo: row[5] };
    }
    return row;
  });
  const active = rows.filter((r) => Number(r.activo) === 1);
  const keep = new Set(dedupeTiposColeccion(active).map((t) => Number(t.id)));
  let n = 0;
  for (const r of active) {
    if (keep.has(Number(r.id))) continue;
    await db.execute({
      sql: 'UPDATE core_tipos_coleccion SET activo = 0 WHERE id = ?',
      args: [r.id],
    });
    console.log(`[Local] Desactivado id=${r.id} slug="${cleanSlug(r.slug)}" nombre="${cleanNombre(r.nombre)}"`);
    n += 1;
  }
  for (const r of active) {
    if (!keep.has(Number(r.id))) continue;
    const cleaned = cleanSlug(r.slug);
    if (cleaned !== String(r.slug)) {
      await db.execute({
        sql: 'UPDATE core_tipos_coleccion SET slug = ? WHERE id = ?',
        args: [cleaned, r.id],
      });
      console.log(`[Local] Slug limpiado id=${r.id}: "${r.slug}" → "${cleaned}"`);
    }
  }
  return n;
}

async function main() {
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    await deactivateOnTurso();
  } else {
    console.log('Turso no configurado. Se omite.');
  }
  await deactivateOnLocal();
  console.log('Listo. Reinicia npm run local y recarga el navegador.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
