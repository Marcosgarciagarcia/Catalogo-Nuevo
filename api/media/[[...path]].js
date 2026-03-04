/**
 * Una sola función para todas las rutas /api/media/* (books, authors, publishers, stats).
 * Reduce el número de Serverless Functions para respetar el límite del plan Hobby (12).
 */

import { executeQuery } from '../../lib/turso.js';
import { QUERIES } from '../../lib/queries.js';

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
  if (req.method === 'OPTIONS') return cors(res);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Path desde query (Vercel) o desde URL
  let pathSegments = req.query.path;
  if (pathSegments == null && typeof req.url === 'string') {
    const pathname = req.url.split('?')[0] || '';
    pathSegments = pathname.replace(/^\/api\/media\/?/, '').split('/').filter(Boolean);
  }
  if (!Array.isArray(pathSegments)) pathSegments = pathSegments ? [pathSegments] : [];
  const segment = pathSegments[0];
  const id = pathSegments.length > 1 ? pathSegments[1] : req.query.id;

  try {
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

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Error in /api/media:', error);
    return res.status(500).json({ error: 'Server error', message: error.message });
  }
}
