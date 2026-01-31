/**
 * POST /api/auth/verify
 * Verifica si un JWT es válido y devuelve los datos del usuario
 */

import { authenticateRequest } from '../lib/auth.js';

export default async function handler(req, res) {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = authenticateRequest(req);

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid or expired token' 
      });
    }

    // Token válido, devolver datos del usuario
    return res.status(200).json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        isStaff: user.isStaff
      }
    });

  } catch (error) {
    console.error('Error in /api/auth/verify:', error);
    return res.status(500).json({ 
      error: 'Verification error',
      message: error.message 
    });
  }
}
