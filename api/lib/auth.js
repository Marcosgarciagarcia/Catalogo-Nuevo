/**
 * Autenticación JWT solo en servidor.
 * JWT_SECRET debe estar en variables de entorno (nunca en el frontend).
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Extrae y verifica el JWT del header Authorization: Bearer <token>.
 * @param {import('http').IncomingMessage} req - Request (debe tener req.headers)
 * @returns {{ id: number, username: string, email: string, isAdmin: boolean, isStaff: boolean } | null}
 */
export function authenticateRequest(req) {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not set');
    return null;
  }

  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email ?? '',
      isAdmin: Boolean(decoded.isAdmin),
      isStaff: Boolean(decoded.isStaff),
    };
  } catch {
    return null;
  }
}

/**
 * Firma un JWT para un usuario (solo usar en servidor, p. ej. en login).
 * @param {object} payload - { id, username, email, isAdmin, isStaff }
 * @param {string} [expiresIn='7d']
 * @returns {string}
 */
export function signToken(payload, expiresIn = '7d') {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Para endpoints de escritura: exige JWT válido.
 * Uso: const user = requireAuth(req); if (!user) return res.status(401).json({ error: 'Unauthorized' });
 * Opcional: requireStaff(req) o requireAdmin(req) para exigir rol.
 * @param {import('http').IncomingMessage} req
 * @returns {ReturnType<authenticateRequest>}
 */
export function requireAuth(req) {
  return authenticateRequest(req);
}

/** Exige que el usuario sea staff o admin. Devuelve null si no está autenticado o no tiene rol. */
export function requireStaff(req) {
  const user = authenticateRequest(req);
  return user && (user.isStaff || user.isAdmin) ? user : null;
}

/** Exige que el usuario sea admin. Devuelve null si no está autenticado o no es admin. */
export function requireAdmin(req) {
  const user = authenticateRequest(req);
  return user && user.isAdmin ? user : null;
}
