/**
 * GET /api/media/stats
 * Devuelve estadísticas del catálogo (totales de libros, autores, editoriales, etc.)
 */

import { executeQuery } from '../../lib/turso.js';
import { QUERIES } from '../../lib/queries.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rows = await executeQuery(QUERIES.GET_BOOKS_STATS);
    const stats = rows[0] || {};
    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error in /api/media/stats:', error);
    return res.status(500).json({
      error: 'Error fetching stats',
      message: error.message,
    });
  }
}
