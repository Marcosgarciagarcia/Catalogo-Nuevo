/**
 * Diagnóstico de integridad referencial para core_titulos id = 253.
 * Comprueba que cada FK del registro apunte a una fila existente.
 *
 * Uso: node scripts/check-fk-titulo-253.js
 * Requiere: .env.local con TURSO_DATABASE_URL y TURSO_AUTH_TOKEN (o ejecutar desde entorno con esas variables).
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env.local');

function loadEnv() {
  if (existsSync(envPath)) {
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
}

loadEnv();

const { executeQuery } = await import('../api/lib/turso.js');

const TITULO_ID = 253;

// FK conocidas de core_titulos: columna → { tabla, columna_referenciada }
const FK_MAP = [
  { col: 'codiAutor_id', table: 'core_autores', refCol: 'id' },
  { col: 'codiEditorial_id', table: 'core_editoriales', refCol: 'id' },
  { col: 'codiSoporte_id', table: 'core_soportes', refCol: 'id' },
  { col: 'codiUbicacion_id', table: 'core_ubicaciones', refCol: 'id' },
  { col: 'codiEstante_id', table: 'core_ubicaciones_sub', refCol: 'codiEstante' },
  { col: 'codiGenero_id', table: 'core_generos', refCol: 'id' },
];

async function main() {
  console.log(`\n=== Diagnóstico FK para core_titulos.id = ${TITULO_ID} ===\n`);

  const row = await executeQuery('SELECT * FROM core_titulos WHERE id = ?', [TITULO_ID]);
  if (!row?.length) {
    console.log('No existe ningún registro con id =', TITULO_ID);
    return;
  }

  const r = row[0];
  console.log('Registro encontrado:');
  console.log('  titulo:', r.titulo ?? '(null)');
  console.log('  EAN:', r.EAN ?? '(null)');
  console.log('');

  const problems = [];

  for (const fk of FK_MAP) {
    const val = r[fk.col];
    const colName = fk.col;
    const refTable = fk.table;
    const refCol = fk.refCol;

    if (val == null || val === '') {
      console.log(`  ${colName} = NULL/empty → no se comprueba FK`);
      continue;
    }

    let exists = false;
    try {
      const check = await executeQuery(
        `SELECT 1 FROM ${refTable} WHERE ${refCol} = ? LIMIT 1`,
        [val]
      );
      exists = check?.length > 0;
    } catch (err) {
      console.log(`  ${colName} = ${val} → ERROR al comprobar en ${refTable}: ${err.message}`);
      problems.push({ col: colName, val, issue: err.message });
      continue;
    }

    if (!exists) {
      console.log(`  ${colName} = ${val} → NO EXISTE en ${refTable}.${refCol} (integridad referencial rota)`);
      problems.push({ col: colName, val, issue: `No existe fila en ${refTable} con ${refCol}=${val}` });
    } else {
      console.log(`  ${colName} = ${val} → OK (existe en ${refTable})`);
    }
  }

  console.log('');
  const fkList = await executeQuery("SELECT * FROM pragma_foreign_key_list('core_titulos')");
  if (fkList?.length) {
    console.log('FK definidas en la BD (pragma_foreign_key_list):');
    for (const f of fkList) {
      console.log(`  ${f.from} → ${f.table}.${f.to}`);
    }
    console.log('');
  }

  if (problems.length) {
    console.log('--- Resumen ---');
    console.log('Problemas encontrados:', problems.length);
    problems.forEach((p) => console.log(`  - ${p.col} = ${p.val}: ${p.issue}`));
    console.log('\nPara corregir: actualiza el registro 253 con valores que existan en las tablas referenciadas, o pon NULL en la FK rota si lo permite el esquema.');
  } else {
    console.log('Todas las FK del registro apuntan a filas existentes.');
    console.log('Si el error persiste al guardar, puede deberse a:');
    console.log('  1. Un valor que intentas guardar (ej. nuevo codiEstante_id) que no existe en la tabla referida.');
    console.log('  2. codiEstante_id debe ser un codiEstante de core_ubicaciones_sub (no el id de otra tabla).');
    console.log('  3. Otra tabla que referencia a core_titulos(253) y falla al actualizarse.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
