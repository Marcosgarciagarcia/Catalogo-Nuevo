/**
 * GET /api/media/authors
 * Lista todos los autores con sus estadísticas
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
      // Buscar autores por nombre
      query = QUERIES.SEARCH_AUTHORS;
      params = [`%${search}%`];
    } else {
      // Obtener todos los autores
      query = QUERIES.GET_ALL_AUTHORS;
    }

    const authors = await executeQuery(query, params);

    return res.status(200).json({
      data: authors,
      total: authors.length,
      filters: {
        search: search || null
      }
    });

  } catch (error) {
    console.error('Error in /api/media/authors:', error);
    return res.status(500).json({ 
      error: 'Error fetching authors',
      message: error.message 
    });
  }
}
