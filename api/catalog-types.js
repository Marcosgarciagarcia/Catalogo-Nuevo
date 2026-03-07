/**
 * GET /api/catalog-types
 * Devuelve los tipos de colección activos para el menú inicial (ordenados).
 */

import { executeQuery } from './lib/turso.js';
import { QUERIES } from './lib/queries.js';

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
    const data = (rows || []).map((r) => ({
      id: r.id,
      slug: r.slug,
      nombre: r.nombre,
      orden: r.orden,
      descripcion: r.descripcion ?? null,
    }));

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
