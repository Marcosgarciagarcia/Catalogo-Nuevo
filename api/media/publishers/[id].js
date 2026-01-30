/**
 * GET /api/media/publishers/:id
 * Obtiene el detalle de una editorial específica
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
      return res.status(400).json({ error: 'Publisher ID is required' });
    }

    const publishers = await executeQuery(QUERIES.GET_PUBLISHER_BY_ID, [id]);

    if (!publishers || publishers.length === 0) {
      return res.status(404).json({ error: 'Publisher not found' });
    }

    return res.status(200).json(publishers[0]);

  } catch (error) {
    console.error(`Error in /api/media/publishers/${req.query.id}:`, error);
    return res.status(500).json({ 
      error: 'Error fetching publisher details',
      message: error.message 
    });
  }
}
