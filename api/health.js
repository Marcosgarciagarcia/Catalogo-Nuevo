/**
 * GET /api/health
 * Comprueba que la API responde y que las variables de entorno están definidas.
 * No expone valores secretos.
 */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tursoSet = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
  const jwtSet = Boolean(process.env.JWT_SECRET);

  return res.status(200).json({
    ok: true,
    api: 'catalogo',
    env: {
      turso: tursoSet ? 'set' : 'missing',
      jwt: jwtSet ? 'set' : 'missing',
    },
  });
}
