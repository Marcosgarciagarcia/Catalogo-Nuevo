/**
 * Obtiene la estructura de core_autores, core_editoriales y core_titulos
 * desde la base de datos Turso (SQLite).
 * Uso: node scripts/schema-info.js   (desde la raíz del proyecto, con .env.local)
 *
 * pragma_table_info('tabla') devuelve: cid, name, type, notnull, dflt_value, pk
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env.local');

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error(`No se encuentra .env.local en ${rootDir}`);
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

async function getTableInfo(tableName) {
  try {
    const rows = await executeQuery(`SELECT * FROM pragma_table_info(?)`, [tableName]);
    return rows;
  } catch (err) {
    return { error: err.message };
  }
}

function formatTable(tableName, rows) {
  if (rows.error) {
    return `## ${tableName}\nError: ${rows.error}\n`;
  }
  let out = `## ${tableName}\n\n`;
  out += `| # | Columna | Tipo | NOT NULL | Default | PK |\n`;
  out += `|---|---------|------|----------|--------|----|\n`;
  for (const r of rows) {
    const notnull = r.notnull === 1 ? '**Sí**' : 'No';
    const pk = r.pk === 1 ? 'Sí' : '';
    const dflt = r.dflt_value != null ? String(r.dflt_value) : '';
    out += `| ${r.cid} | ${r.name} | ${r.type || ''} | ${notnull} | ${dflt} | ${pk} |\n`;
  }
  out += '\n';
  return out;
}

async function main() {
  console.log('# Estructura de tablas (Turso/SQLite)\n');
  const tables = ['core_autores', 'core_editoriales', 'core_titulos'];
  for (const table of tables) {
    const rows = await getTableInfo(table);
    console.log(formatTable(table, rows));
  }
  // Resumen solo NOT NULL
  console.log('---\n## Resumen: campos NOT NULL por tabla\n');
  for (const table of tables) {
    const rows = await getTableInfo(table);
    if (!rows.error) {
      const notNullCols = rows.filter((r) => r.notnull === 1).map((r) => r.name);
      console.log(`**${table}**: ${notNullCols.join(', ') || '(ninguno)'}\n`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
