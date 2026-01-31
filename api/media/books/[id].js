/**
 * GET /api/media/books/:id
 * Obtiene el detalle de un libro específico
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
      return res.status(400).json({ error: 'Book ID is required' });
    }

    const books = await executeQuery(QUERIES.GET_BOOK_BY_ID, [id]);

    if (!books || books.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Sanitizar datos para evitar problemas con caracteres especiales
    const book = books[0];
    const sanitizedBook = {
      ...book,
      titulo: book.titulo || '',
      tituloOriginal: book.tituloOriginal || null,
      nombreAutor: book.nombreAutor || '',
      editorial: book.editorial || '',
      sinopsis: book.sinopsis || null,
      observaciones: book.observaciones || null,
      coleccion: book.coleccion || null,
      serie: book.serie || null
    };

    return res.status(200).json(sanitizedBook);

  } catch (error) {
    console.error(`Error in /api/media/books/${req.query.id}:`, error);
    return res.status(500).json({ 
      error: 'Error fetching book details',
      message: error.message 
    });
  }
}
