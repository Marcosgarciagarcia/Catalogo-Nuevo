/**
 * GET /api/media/publishers
 * Lista todas las editoriales con sus estadísticas
 */

import { executeQuery } from '../../lib/turso.js';
import { QUERIES } from '../../lib/queries.js';

export default async function handler(req, res) {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { search } = req.query;

    let query;
    let params = [];

    if (search) {
      // Buscar editoriales por nombre
      query = QUERIES.SEARCH_PUBLISHERS;
      params = [`%${search}%`];
    } else {
      // Obtener todas las editoriales
      query = QUERIES.GET_ALL_PUBLISHERS;
    }

    const publishers = await executeQuery(query, params);

    return res.status(200).json({
      data: publishers,
      total: publishers.length,
      filters: {
        search: search || null
      }
    });

  } catch (error) {
    console.error('Error in /api/media/publishers:', error);
    return res.status(500).json({ 
      error: 'Error fetching publishers',
      message: error.message 
    });
  }
}
