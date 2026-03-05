/**
 * Una sola función para /api/media y /api/media/* (books, authors, publishers, stats).
 * Las peticiones a /api/media/books, /api/media/books/123, etc. se reescriben a /api/media?path=...
 */

import { executeQuery } from './lib/turso.js';
import { QUERIES } from './lib/queries.js';
import { requireStaff } from './lib/auth.js';

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

    // path viene del rewrite: /api/media/books -> ?path=books, /api/media/books/123 -> ?path=books/123
    const pathParam = req.query.path || '';
    const pathSegments = typeof pathParam === 'string' ? pathParam.split('/').filter(Boolean) : [];
    const segment = pathSegments[0];
    const id = pathSegments.length > 1 ? pathSegments[1] : req.query.id;

    // ---------- POST (altas): solo books, authors, publishers; sin id en path ----------
    if (req.method === 'POST') {
      if (!['books', 'authors', 'publishers'].includes(segment) || pathSegments.length > 1) {
        return res.status(404).json({ error: 'Not found' });
      }
      const user = requireStaff(req);
      if (!user) {
        return res.status(401).json({ error: 'No autorizado. Se requiere sesión de staff.' });
      }
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

      if (segment === 'authors') {
        const nombreAutor = (body.nombreAutor || '').trim();
        if (!nombreAutor) return res.status(400).json({ error: 'nombreAutor es obligatorio' });
        const rows = await executeQuery(QUERIES.INSERT_AUTHOR, [
          nombreAutor,
          (body.enlaceWiki || '').trim() || null,
          (body.enlaceWiki2 || '').trim() || null,
        ]);
        const newId = rows?.[0]?.id;
        if (newId == null) return res.status(500).json({ error: 'Error al crear autor' });
        return res.status(201).json({ id: newId });
      }

      if (segment === 'publishers') {
        const descriEditorial = (body.descriEditorial || '').trim();
        if (!descriEditorial) return res.status(400).json({ error: 'descriEditorial es obligatorio' });
        const rows = await executeQuery(QUERIES.INSERT_PUBLISHER, [descriEditorial]);
        const newId = rows?.[0]?.id;
        if (newId == null) return res.status(500).json({ error: 'Error al crear editorial' });
        return res.status(201).json({ id: newId });
      }

      if (segment === 'books') {
        let codiAutor_id = body.codiAutor_id != null ? Number(body.codiAutor_id) : null;
        let codiEditorial_id = body.codiEditorial_id != null ? Number(body.codiEditorial_id) : null;
        const authorName = (body.authorName || '').trim();
        const publisherName = (body.publisherName || '').trim();
        const addNewAuthor = Boolean(body.addNewAuthor);
        const addNewPublisher = Boolean(body.addNewPublisher);

        if ((addNewAuthor || !codiAutor_id) && authorName) {
          const rows = await executeQuery(QUERIES.INSERT_AUTHOR, [authorName, null, null]);
          codiAutor_id = rows?.[0]?.id;
          if (codiAutor_id == null) return res.status(500).json({ error: 'Error al crear autor' });
        }
        if ((addNewPublisher || !codiEditorial_id) && publisherName) {
          const rows = await executeQuery(QUERIES.INSERT_PUBLISHER, [publisherName]);
          codiEditorial_id = rows?.[0]?.id;
          if (codiEditorial_id == null) return res.status(500).json({ error: 'Error al crear editorial' });
        }
        if (codiAutor_id == null) return res.status(400).json({ error: 'Se requiere codiAutor_id o authorName' });
        if (codiEditorial_id == null) return res.status(400).json({ error: 'Se requiere codiEditorial_id o publisherName' });

        const EAN = (body.EAN || '').replace(/-/g, '').trim();
        if (!EAN) return res.status(400).json({ error: 'EAN es obligatorio' });
        const titulo = (body.titulo || '').trim() || null;
        const tituloOriginal = (body.tituloOriginal || '').trim() || null;
        const anyoEdicion = body.anyoEdicion != null && body.anyoEdicion !== '' ? Number(body.anyoEdicion) : null;
        const numeroPaginas = body.numeroPaginas != null && body.numeroPaginas !== '' ? Number(body.numeroPaginas) : null;
        const portada_cloudinary = (body.portada_cloudinary || '').trim() || null;
        const sinopsis = (body.sinopsis || '').trim() || null;
        const observaciones = (body.observaciones || '').trim() || null;
        const coleccion = (body.coleccion || '').trim() || null;
        const serie = (body.serie || '').trim() || null;

        const rows = await executeQuery(QUERIES.INSERT_BOOK, [
          EAN, titulo, tituloOriginal, anyoEdicion, numeroPaginas,
          portada_cloudinary, sinopsis, observaciones, coleccion, serie,
          codiAutor_id, codiEditorial_id,
        ]);
        const newId = rows?.[0]?.id;
        if (newId == null) return res.status(500).json({ error: 'Error al crear libro' });
        return res.status(201).json({ id: newId });
      }
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

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
