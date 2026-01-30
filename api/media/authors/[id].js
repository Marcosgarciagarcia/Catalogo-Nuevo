/**
 * GET /api/media/authors/:id
 * Obtiene el detalle de un autor específico
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
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Author ID is required' });
    }

    const authors = await executeQuery(QUERIES.GET_AUTHOR_BY_ID, [id]);

    if (!authors || authors.length === 0) {
      return res.status(404).json({ error: 'Author not found' });
    }

    return res.status(200).json(authors[0]);

  } catch (error) {
    console.error(`Error in /api/media/authors/${req.query.id}:`, error);
    return res.status(500).json({ 
      error: 'Error fetching author details',
      message: error.message 
    });
  }
}
