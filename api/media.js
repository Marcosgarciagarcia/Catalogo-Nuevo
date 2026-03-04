/**
 * Una sola función para /api/media y /api/media/* (books, authors, publishers, stats).
 * Las peticiones a /api/media/books, /api/media/books/123, etc. se reescriben a /api/media?path=...
 */

import { executeQuery } from './lib/turso.js';
import { QUERIES } from './lib/queries.js';

function cors(res) {
  return res.status(200).json({});
}

function sanitizeBook(book) {
  return {
    ...book,
    titulo: book.titulo || '',
    tituloOriginal: book.tituloOriginal ?? null,
    nombreAutor: book.nombreAutor || '',
    editorial: book.editorial || '',
    sinopsis: book.sinopsis ?? null,
    observaciones: book.observaciones ?? null,
    coleccion: book.coleccion ?? null,
    serie: book.serie ?? null,
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') return cors(res);
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // path viene del rewrite: /api/media/books -> ?path=books, /api/media/books/123 -> ?path=books/123
    const pathParam = req.query.path || '';
    const pathSegments = typeof pathParam === 'string' ? pathParam.split('/').filter(Boolean) : [];
    const segment = pathSegments[0];
    const id = pathSegments.length > 1 ? pathSegments[1] : req.query.id;

    // GET /api/media/stats
    if (segment === 'stats') {
      const rows = await executeQuery(QUERIES.GET_BOOKS_STATS);
      return res.status(200).json(rows[0] || {});
    }

    // GET /api/media/books y GET /api/media/books/:id
    if (segment === 'books') {
      if (id) {
        const books = await executeQuery(QUERIES.GET_BOOK_BY_ID, [id]);
        if (!books?.length) return res.status(404).json({ error: 'Book not found' });
        return res.status(200).json(sanitizeBook(books[0]));
      }
      const { search, searchBy = 'titulo', letter, filterBy = 'titulo' } = req.query;
      let query, params = [];
      if (search) {
        const searchPattern = `%${search}%`;
        query = searchBy === 'autor' ? QUERIES.SEARCH_BOOKS_BY_AUTHOR : QUERIES.SEARCH_BOOKS_BY_TITLE;
        params = [searchPattern];
      } else if (letter) {
        const letterPattern = `${letter}%`;
        query = filterBy === 'autor' ? QUERIES.FILTER_BOOKS_BY_LETTER_AUTHOR : QUERIES.FILTER_BOOKS_BY_LETTER_TITLE;
        params = [letterPattern];
      } else {
        query = QUERIES.GET_ALL_BOOKS;
      }
      const books = await executeQuery(query, params);
      const sanitized = books.map(sanitizeBook);
      return res.status(200).json({
        data: sanitized,
        total: sanitized.length,
        filters: { search: search || null, searchBy, letter: letter || null, filterBy },
      });
    }

    // GET /api/media/authors y GET /api/media/authors/:id
    if (segment === 'authors') {
      if (id) {
        const authors = await executeQuery(QUERIES.GET_AUTHOR_BY_ID, [id]);
        if (!authors?.length) return res.status(404).json({ error: 'Author not found' });
        return res.status(200).json(authors[0]);
      }
      const { search } = req.query;
      const query = search ? QUERIES.SEARCH_AUTHORS : QUERIES.GET_ALL_AUTHORS;
      const params = search ? [`%${search}%`] : [];
      const authors = await executeQuery(query, params);
      return res.status(200).json({ data: authors, total: authors.length, filters: { search: search || null } });
    }

    // GET /api/media/publishers y GET /api/media/publishers/:id
    if (segment === 'publishers') {
      if (id) {
        const publishers = await executeQuery(QUERIES.GET_PUBLISHER_BY_ID, [id]);
        if (!publishers?.length) return res.status(404).json({ error: 'Publisher not found' });
        return res.status(200).json(publishers[0]);
      }
      const { search } = req.query;
      const query = search ? QUERIES.SEARCH_PUBLISHERS : QUERIES.GET_ALL_PUBLISHERS;
      const params = search ? [`%${search}%`] : [];
      const publishers = await executeQuery(query, params);
      return res.status(200).json({ data: publishers, total: publishers.length, filters: { search: search || null } });
    }

    // Sin segmento o segmento desconocido: por defecto listar libros (compatibilidad con /api/media/books)
    if (!segment || segment === '') {
      const { search, searchBy = 'titulo', letter, filterBy = 'titulo' } = req.query;
      let query, params = [];
      if (search) {
        query = searchBy === 'autor' ? QUERIES.SEARCH_BOOKS_BY_AUTHOR : QUERIES.SEARCH_BOOKS_BY_TITLE;
        params = [`%${search}%`];
      } else if (letter) {
        query = filterBy === 'autor' ? QUERIES.FILTER_BOOKS_BY_LETTER_AUTHOR : QUERIES.FILTER_BOOKS_BY_LETTER_TITLE;
        params = [`${letter}%`];
      } else {
        query = QUERIES.GET_ALL_BOOKS;
      }
      const books = await executeQuery(query, params);
      const sanitized = books.map(sanitizeBook);
      return res.status(200).json({
        data: sanitized,
        total: sanitized.length,
        filters: { search: search || null, searchBy, letter: letter || null, filterBy },
      });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Error in /api/media:', error);
    const message = error?.message || String(error);
    return res.status(500).json({
      error: 'Error en el servidor',
      message: message,
    });
  }
}
