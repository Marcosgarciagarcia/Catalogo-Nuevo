/**
 * POST /api/auth/logout
 * Cierra sesión (en este caso solo confirma, el cliente debe eliminar el token)
 */

export default async function handler(req, res) {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // En un sistema JWT stateless, el logout se maneja en el cliente
    // eliminando el token. Aquí solo confirmamos la acción.
    
    return res.status(200).json({
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Error in /api/auth/logout:', error);
    return res.status(500).json({ 
      error: 'Logout error',
      message: error.message 
    });
  }
}
