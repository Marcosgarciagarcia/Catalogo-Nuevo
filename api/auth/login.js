/**
 * POST /api/auth/login
 * Autentica un usuario y devuelve un JWT
 */

import { executeQuery } from '../lib/turso.js';
import { verifyDjangoPassword, generateToken } from '../lib/auth.js';

export default async function handler(req, res) {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    // Validar campos requeridos
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    // Buscar usuario en la base de datos
    const query = `
      SELECT 
        id,
        username,
        email,
        password,
        is_superuser,
        is_staff,
        is_active,
        first_name,
        last_name,
        last_login
      FROM auth_user
      WHERE username = ?
    `;

    const users = await executeQuery(query, [username]);

    if (users.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    const user = users[0];

    // Verificar que el usuario esté activo
    if (!user.is_active) {
      return res.status(403).json({ 
        error: 'User account is disabled' 
      });
    }

    // Verificar contraseña
    const isPasswordValid = await verifyDjangoPassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Actualizar last_login
    const updateQuery = `
      UPDATE auth_user 
      SET last_login = datetime('now') 
      WHERE id = ?
    `;
    await executeQuery(updateQuery, [user.id]);

    // Generar JWT
    const token = generateToken(user);

    // Devolver token y datos del usuario (sin contraseña)
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isAdmin: user.is_superuser === 1,
        isStaff: user.is_staff === 1
      }
    });

  } catch (error) {
    console.error('Error in /api/auth/login:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      message: error.message 
    });
  }
}
