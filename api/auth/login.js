/**
 * POST /api/auth/login
 * Valida usuario/contraseña contra la tabla de usuarios en Turso
 * y devuelve un JWT y los datos del usuario.
 * La tabla esperada es core_users (id, username, password_hash, email, is_staff, is_admin).
 */

import { executeQuery } from '../lib/turso.js';
import { signToken } from '../lib/auth.js';
import bcrypt from 'bcryptjs';

const USER_TABLE = 'core_users';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { username, password } = body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const users = await executeQuery(
      `SELECT id, username, password_hash, email, is_staff, is_admin FROM ${USER_TABLE} WHERE username = ? LIMIT 1`,
      [String(username).trim()]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = users[0];
    const passwordHash = user.password_hash;
    if (!passwordHash) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await bcrypt.compare(String(password), passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isStaff = Boolean(user.is_staff);
    const isAdmin = Boolean(user.is_admin);
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email ?? '',
      isAdmin,
      isStaff,
    };

    const token = signToken(payload);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email ?? '',
        isAdmin,
        isStaff,
      },
    });
  } catch (error) {
    console.error('Error in /api/auth/login:', error);
    return res.status(500).json({
      error: 'Login error',
      message: error.message,
    });
  }
}
