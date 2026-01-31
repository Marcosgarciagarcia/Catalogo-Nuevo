/**
 * GET /api/media/books
 * Lista todos los libros con filtros y paginación
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
    const { search, searchBy = 'titulo', letter, filterBy = 'titulo' } = req.query;

    let query;
    let params = [];

    // Determinar qué query usar según los filtros
    if (search) {
      // Búsqueda por término
      const searchPattern = `%${search}%`;
      
      if (searchBy === 'autor') {
        query = QUERIES.SEARCH_BOOKS_BY_AUTHOR;
      } else {
        query = QUERIES.SEARCH_BOOKS_BY_TITLE;
      }
      
      params = [searchPattern];
    } else if (letter) {
      // Filtrar por letra inicial
      const letterPattern = `${letter}%`;
      
      if (filterBy === 'autor') {
        query = QUERIES.FILTER_BOOKS_BY_LETTER_AUTHOR;
      } else {
        query = QUERIES.FILTER_BOOKS_BY_LETTER_TITLE;
      }
      
      params = [letterPattern];
    } else {
      // Obtener todos los libros
      query = QUERIES.GET_ALL_BOOKS;
    }

    const books = await executeQuery(query, params);

    // Sanitizar datos para evitar problemas con caracteres especiales
    const sanitizedBooks = books.map(book => ({
      ...book,
      titulo: book.titulo || '',
      tituloOriginal: book.tituloOriginal || null,
      nombreAutor: book.nombreAutor || '',
      editorial: book.editorial || '',
      sinopsis: book.sinopsis || null,
      observaciones: book.observaciones || null,
      coleccion: book.coleccion || null,
      serie: book.serie || null
    }));

    return res.status(200).json({
      data: sanitizedBooks,
      total: sanitizedBooks.length,
      filters: {
        search: search || null,
        searchBy,
        letter: letter || null,
        filterBy
      }
    });

  } catch (error) {
    console.error('Error in /api/media/books:', error);
    return res.status(500).json({ 
      error: 'Error fetching books',
      message: error.message 
    });
  }
}
