/**
 * Cliente Turso solo para uso en el servidor (API).
 * Usa TURSO_DATABASE_URL y TURSO_AUTH_TOKEN de variables de entorno.
 * Nunca exponer estas variables al frontend.
 */

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

/**
 * Ejecuta una query en Turso (API HTTP).
 * @param {string} sql - Query SQL con ? para parámetros
 * @param {unknown[]} params - Parámetros en orden
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function executeQuery(sql, params = []) {
  if (!TURSO_URL || !TURSO_TOKEN) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment');
  }

  const response = await fetch(TURSO_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      statements: [{ q: sql, params }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Turso HTTP error: ${response.status}`);
  }

  const data = await response.json();

  if (data[0]?.error) {
    throw new Error(data[0].error);
  }

  const results = data[0]?.results;
  const rows = results?.rows ?? [];
  const columns = results?.columns ?? [];

  return rows.map((row) => {
    const obj = {};
    columns.forEach((col, index) => {
      obj[col] = row[index];
    });
    return obj;
  });
}
