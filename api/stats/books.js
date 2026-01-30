/**
 * GET /api/stats/books
 * Obtiene estadísticas del catálogo de libros
 */

import { executeQuery } from '../lib/turso.js';
import { QUERIES } from '../lib/queries.js';

export default async function handler(req, res) {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stats = await executeQuery(QUERIES.GET_BOOKS_STATS);

    if (!stats || stats.length === 0) {
      return res.status(500).json({ error: 'Error fetching statistics' });
    }

    return res.status(200).json({
      ...stats[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in /api/stats/books:', error);
    return res.status(500).json({ 
      error: 'Error fetching statistics',
      message: error.message 
    });
  }
}
