/**
 * Cliente Turso solo para uso en el servidor (API).
 * Usa TURSO_DATABASE_URL y TURSO_AUTH_TOKEN de variables de entorno.
 * Nunca exponer estas variables al frontend.
 */

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

function toPipelineArg(value) {
  if (value === null || value === undefined) {
    return { type: 'null' };
  }
  if (typeof value === 'number') {
    return { type: Number.isInteger(value) ? 'integer' : 'float', value: String(value) };
  }
  return { type: 'text', value: String(value) };
}

/**
 * Ejecuta varias sentencias en una sola petición (transacción implícita en pipeline).
 * Usa el endpoint /v2/pipeline de Turso. Si una sentencia falla, ninguna se aplica.
 * @param {{ sql: string, params?: unknown[] }[]} statements - Lista de { sql, params }
 * @param {{ noWrap?: boolean }} options - Si noWrap: true, no se añade BEGIN/COMMIT (para usar PRAGMA antes de BEGIN).
 * @returns {Promise<{ rows: unknown[][], last_insert_rowid: number | null }[]>} Resultado por sentencia
 */
export async function executePipeline(statements, options = {}) {
  if (!TURSO_URL || !TURSO_TOKEN) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment');
  }
  const base = TURSO_URL.replace(/\/$/, '');
  const pipelineUrl = base.startsWith('http') ? `${base}/v2/pipeline` : `https://${base}/v2/pipeline`;

  const stmtRequests = statements.map(({ sql, params = [] }) => ({
    type: 'execute',
    stmt: { sql, args: params.map(toPipelineArg) },
  }));

  const requests = options.noWrap
    ? [...stmtRequests, { type: 'close' }]
    : [
        { type: 'execute', stmt: { sql: 'BEGIN' } },
        ...stmtRequests,
        { type: 'execute', stmt: { sql: 'COMMIT' } },
        { type: 'close' },
      ];

  const response = await fetch(pipelineUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    throw new Error(`Turso pipeline HTTP error: ${response.status}`);
  }

  const data = await response.json();
  const results = data.results || [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.type !== 'ok' || (r.response?.type === 'execute' && r.response?.result?.error)) {
      const err = r.response?.result?.error || r.error || data;
      throw new Error(typeof err === 'string' ? err : JSON.stringify(err));
    }
  }

  return results
    .filter((r) => r.response?.type === 'execute' && r.response?.result)
    .map((r) => {
      const res = r.response.result;
      const rows = (res.rows || []).map((row) => row.map((cell) => cell?.value ?? cell));
      return { rows, last_insert_rowid: res.last_insert_rowid ?? null };
    });
}

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
