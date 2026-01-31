/**
 * Utilidades de autenticación
 * Manejo de JWT y verificación de contraseñas Django
 */

import jwt from 'jsonwebtoken';

// Secret para JWT (debe estar en variables de entorno en producción)
const JWT_SECRET = process.env.JWT_SECRET || 'casateca-secret-key-change-in-production';
const JWT_EXPIRATION = '8h'; // Token válido por 8 horas

/**
 * Genera un JWT para un usuario
 * @param {Object} user - Datos del usuario
 * @returns {string} Token JWT
 */
export function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    isAdmin: user.is_superuser === 1,
    isStaff: user.is_staff === 1,
    isActive: user.is_active === 1
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

/**
 * Verifica y decodifica un JWT
 * @param {string} token - Token JWT
 * @returns {Object|null} Payload del token o null si es inválido
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Verifica una contraseña contra el hash de Django
 * Django usa PBKDF2 con formato: algorithm$iterations$salt$hash
 * @param {string} password - Contraseña en texto plano
 * @param {string} hashedPassword - Hash de Django
 * @returns {Promise<boolean>} True si la contraseña es correcta
 */
export async function verifyDjangoPassword(password, hashedPassword) {
  try {
    // Formato Django: pbkdf2_sha256$iterations$salt$hash
    const parts = hashedPassword.split('$');
    
    if (parts.length !== 4) {
      console.error('Invalid Django password format');
      return false;
    }

    const [algorithm, iterations, salt, hash] = parts;
    
    // Verificar que sea PBKDF2 SHA256
    if (algorithm !== 'pbkdf2_sha256') {
      console.error('Unsupported password algorithm:', algorithm);
      return false;
    }

    // Generar hash con los mismos parámetros
    const crypto = await import('crypto');
    const derivedKey = crypto.pbkdf2Sync(
      password,
      salt,
      parseInt(iterations),
      32, // 32 bytes = 256 bits
      'sha256'
    );

    // Convertir a base64 para comparar
    const derivedHash = derivedKey.toString('base64');
    
    return derivedHash === hash;
  } catch (error) {
    console.error('Error verifying Django password:', error);
    return false;
  }
}

/**
 * Genera un hash de contraseña compatible con Django
 * Útil para crear nuevos usuarios
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} Hash de contraseña en formato Django
 */
export async function hashDjangoPassword(password) {
  const crypto = await import('crypto');
  const iterations = 720000; // Django 5.0+ usa 720000 iteraciones
  const salt = crypto.randomBytes(12).toString('base64').slice(0, 12);
  
  const derivedKey = crypto.pbkdf2Sync(
    password,
    salt,
    iterations,
    32,
    'sha256'
  );
  
  const hash = derivedKey.toString('base64');
  
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

/**
 * Extrae el token JWT del header Authorization
 * @param {Object} req - Request object
 * @returns {string|null} Token o null
 */
export function extractToken(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }
  
  // Formato: "Bearer <token>"
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Middleware para proteger rutas
 * Verifica que el usuario esté autenticado
 * @param {Object} req - Request object
 * @returns {Object|null} Usuario decodificado o null
 */
export function authenticateRequest(req) {
  const token = extractToken(req);
  
  if (!token) {
    return null;
  }
  
  const user = verifyToken(token);
  
  if (!user || !user.isActive) {
    return null;
  }
  
  return user;
}

/**
 * Verifica que el usuario sea administrador
 * @param {Object} user - Usuario decodificado del JWT
 * @returns {boolean} True si es admin
 */
export function isAdmin(user) {
  return user && user.isAdmin === true;
}

/**
 * Verifica que el usuario tenga permisos de staff
 * @param {Object} user - Usuario decodificado del JWT
 * @returns {boolean} True si es staff o admin
 */
export function isStaff(user) {
  return user && (user.isStaff === true || user.isAdmin === true);
}
