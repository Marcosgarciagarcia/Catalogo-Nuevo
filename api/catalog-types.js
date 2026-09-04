/**
 * GET /api/catalog-types
 * Devuelve los tipos de colección activos para el menú inicial (ordenados).
 * Deduplica por nombre y limpia slugs (tabs, espacios).
 */

import { executeQuery } from './lib/turso.js';
import { QUERIES } from './lib/queries.js';
import { dedupeTiposColeccion } from './lib/tipos-coleccion.js';

function cors(res) {
  return res.status(200).json({});
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') return cors(res);
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const rows = await executeQuery(QUERIES.GET_TIPOS_COLECCION);
    const data = dedupeTiposColeccion(rows);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    return res.status(200).json({ data });
  } catch (error) {
    console.error('Error in /api/catalog-types:', error);
    const message = error?.message || String(error);
    return res.status(500).json({
      error: 'Error en el servidor',
      message,
    });
  }
}
