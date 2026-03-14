/**
 * Una sola función para /api/media y /api/media/* (books, authors, publishers, stats).
 * Las peticiones a /api/media/books, /api/media/books/123, etc. se reescriben a /api/media?path=...
 */

import { executeQuery, executePipeline } from './lib/turso.js';
import { QUERIES } from './lib/queries.js';
import { requireStaff } from './lib/auth.js';

function cors(res) {
  return res.status(200).json({});
}

/**
 * Normaliza el slug de tipo de colección: decodifica si viene codificado y unifica a NFC (Unicode).
 * Así coincidimos con el valor almacenado en core_tipos_coleccion.slug (ej. "música").
 */
function normalizarTipoSlug(val) {
  if (val == null || String(val).trim() === '') return null;
  let s = String(val).trim();
  try {
    if (s.includes('%')) s = decodeURIComponent(s);
  } catch (_) {}
  s = s.normalize('NFC').trim();
  return s || null;
}

/** Slug sin tildes/ñ para fallback si en BD está guardado así (ej. "musica" en vez de "música"). */
function slugSinAcentos(slug) {
  if (!slug || typeof slug !== 'string') return slug;
  return slug
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ñ/gi, 'n');
}

/** Añade # al inicio de cada palabra si no empieza por almohadilla (ASC 35) */
function normalizarHastag(texto) {
  if (texto == null || typeof texto !== 'string') return null;
  const t = texto.trim();
  if (!t) return null;
  return t.split(/\s+/).map((w) => (w.charAt(0) === '#' ? w : '#' + w)).join(' ');
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
    hastag: book.hastag ?? null,
    ubicacionDesc: book.ubicacionDesc ?? null,
    estanteDesc: book.estanteDesc ?? null,
    soporteDesc: book.soporteDesc ?? null,
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
        const EAN = (body.EAN || '').replace(/-/g, '').trim();
        if (!EAN) return res.status(400).json({ error: 'EAN es obligatorio' });
        const existingBook = await executeQuery(QUERIES.GET_BOOK_ID_BY_EAN, [EAN]);
        if (existingBook?.length > 0) {
          return res.status(400).json({ error: 'Ya existe un libro con este ISBN/EAN' });
        }

        const authorNameBody = (body.authorName || '').trim();
        const publisherNameBody = (body.publisherName || '').trim();
        const codiAutor_id = body.codiAutor_id != null ? Number(body.codiAutor_id) : null;
        const codiEditorial_id = body.codiEditorial_id != null ? Number(body.codiEditorial_id) : null;
        const addNewAuthor = Boolean(body.addNewAuthor);
        const addNewPublisher = Boolean(body.addNewPublisher);

        let authorNameForBook = '';
        let publisherNameForBook = '';
        let needCreateAuthor = false;
        let needCreatePublisher = false;

        if (codiAutor_id && !authorNameBody) {
          const authorRow = await executeQuery(QUERIES.GET_AUTHOR_BY_ID, [codiAutor_id]);
          if (!authorRow?.length) return res.status(400).json({ error: 'Autor no encontrado' });
          authorNameForBook = authorRow[0].nombreAutor || '';
        } else if (authorNameBody) {
          const existingAuthor = await executeQuery(QUERIES.GET_AUTHOR_ID_BY_NAME, [authorNameBody]);
          if (existingAuthor?.length > 0) {
            authorNameForBook = authorNameBody;
          } else {
            authorNameForBook = authorNameBody;
            needCreateAuthor = true;
          }
        }
        if (!authorNameForBook) return res.status(400).json({ error: 'Se requiere codiAutor_id o authorName' });

        if (codiEditorial_id && !publisherNameBody) {
          const publisherRow = await executeQuery(QUERIES.GET_PUBLISHER_BY_ID, [codiEditorial_id]);
          if (!publisherRow?.length) return res.status(400).json({ error: 'Editorial no encontrada' });
          publisherNameForBook = publisherRow[0].descriEditorial || '';
        } else if (publisherNameBody) {
          const existingPublisher = await executeQuery(QUERIES.GET_PUBLISHER_ID_BY_NAME, [publisherNameBody]);
          if (existingPublisher?.length > 0) {
            publisherNameForBook = publisherNameBody;
          } else {
            publisherNameForBook = publisherNameBody;
            needCreatePublisher = true;
          }
        }
        if (!publisherNameForBook) return res.status(400).json({ error: 'Se requiere codiEditorial_id o publisherName' });

        const titulo = (body.titulo || '').trim() || '';
        const tituloOriginal = (body.tituloOriginal || '').trim() || null;
        const anyoEdicion = body.anyoEdicion != null && body.anyoEdicion !== '' ? Number(body.anyoEdicion) : null;
        const numeroEdicion = body.numeroEdicion != null && body.numeroEdicion !== '' ? Number(body.numeroEdicion) : 1;
        const numeroPaginas = body.numeroPaginas != null && body.numeroPaginas !== '' ? Number(body.numeroPaginas) : 0;
        const numeroEjemplares = body.numeroEjemplares != null && body.numeroEjemplares !== '' ? Number(body.numeroEjemplares) : 1;
        const portada_cloudinary = (body.portada_cloudinary || '').trim() || null;
        const sinopsis = (body.sinopsis || '').trim() || null;
        const observaciones = (body.observaciones || '').trim() || null;
        const coleccion = (body.coleccion || '').trim() || null;
        const serie = (body.serie || '').trim() || null;
        const hastag = normalizarHastag(body.hastag);
        const codiSoporte_id = body.codiSoporte_id != null && body.codiSoporte_id !== '' ? Number(body.codiSoporte_id) : null;

        const bookParams = [
          EAN, titulo, tituloOriginal, anyoEdicion, numeroEdicion, numeroPaginas, numeroEjemplares,
          portada_cloudinary, sinopsis, observaciones, coleccion, serie, hastag,
          codiSoporte_id,
          authorNameForBook, publisherNameForBook,
        ];

        const pipelineStatements = [];
        if (needCreateAuthor) {
          pipelineStatements.push({ sql: QUERIES.INSERT_AUTHOR, params: [authorNameForBook, null, null] });
        }
        if (needCreatePublisher) {
          pipelineStatements.push({ sql: QUERIES.INSERT_PUBLISHER, params: [publisherNameForBook] });
        }
        pipelineStatements.push({ sql: QUERIES.INSERT_BOOK_BY_AUTHOR_AND_PUBLISHER_NAME, params: bookParams });

        const pipelineResults = await executePipeline(pipelineStatements);
        const withRows = pipelineResults.filter((r) => r.rows?.length > 0);
        const bookResult = withRows[withRows.length - 1];
        const idCell = bookResult?.rows?.[0]?.[0];
        const newId = idCell != null ? Number(idCell) : null;
        if (newId == null) return res.status(500).json({ error: 'Error al crear libro' });
        return res.status(201).json({ id: newId });
      }
    }

    // ---------- PUT (edición): solo books con id; requiere staff; se sincroniza en Turso (LWW en app escritorio) ----------
    if (req.method === 'PUT' && segment === 'books' && id) {
      const user = requireStaff(req);
      if (!user) {
        return res.status(401).json({ error: 'No autorizado. Se requiere sesión de staff.' });
      }
      const bookId = Number(id);
      if (!Number.isInteger(bookId)) return res.status(404).json({ error: 'Book not found' });

      const existingBooks = await executeQuery(QUERIES.GET_BOOK_BY_ID, [bookId]);
      if (!existingBooks?.length) return res.status(404).json({ error: 'Book not found' });

      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const EAN = (body.EAN || '').replace(/-/g, '').trim();
      if (!EAN) return res.status(400).json({ error: 'EAN es obligatorio' });

      const existingByEan = await executeQuery(QUERIES.GET_BOOK_ID_BY_EAN, [EAN]);
      if (existingByEan?.length > 0 && Number(existingByEan[0].id) !== bookId) {
        return res.status(400).json({ error: 'Ya existe otro libro con este ISBN/EAN' });
      }

      const authorNameBody = (body.authorName || '').trim();
      const publisherNameBody = (body.publisherName || '').trim();
      const codiAutor_id = body.codiAutor_id != null ? Number(body.codiAutor_id) : null;
      const codiEditorial_id = body.codiEditorial_id != null ? Number(body.codiEditorial_id) : null;
      const addNewAuthor = Boolean(body.addNewAuthor);
      const addNewPublisher = Boolean(body.addNewPublisher);

      let authorId = null;
      let publisherId = null;

      if (codiAutor_id && !authorNameBody) {
        const authorRow = await executeQuery(QUERIES.GET_AUTHOR_BY_ID, [codiAutor_id]);
        if (!authorRow?.length) return res.status(400).json({ error: 'Autor no encontrado' });
        authorId = codiAutor_id;
      } else if (authorNameBody) {
        const existingAuthor = await executeQuery(QUERIES.GET_AUTHOR_ID_BY_NAME, [authorNameBody]);
        if (existingAuthor?.length > 0) {
          authorId = existingAuthor[0].id;
        } else {
          if (!addNewAuthor) return res.status(400).json({ error: 'Se requiere codiAutor_id o authorName (o marcar "Añadir como nuevo")' });
          const insertAuthor = await executeQuery(QUERIES.INSERT_AUTHOR, [authorNameBody, null, null]);
          authorId = insertAuthor?.[0]?.id ?? null;
          if (authorId == null) return res.status(500).json({ error: 'Error al crear autor' });
        }
      }
      if (authorId == null) return res.status(400).json({ error: 'Se requiere codiAutor_id o authorName' });

      if (codiEditorial_id && !publisherNameBody) {
        const publisherRow = await executeQuery(QUERIES.GET_PUBLISHER_BY_ID, [codiEditorial_id]);
        if (!publisherRow?.length) return res.status(400).json({ error: 'Editorial no encontrada' });
        publisherId = codiEditorial_id;
      } else if (publisherNameBody) {
        const existingPublisher = await executeQuery(QUERIES.GET_PUBLISHER_ID_BY_NAME, [publisherNameBody]);
        if (existingPublisher?.length > 0) {
          publisherId = existingPublisher[0].id;
        } else {
          if (!addNewPublisher) return res.status(400).json({ error: 'Se requiere codiEditorial_id o publisherName (o marcar "Añadir como nuevo")' });
          const insertPublisher = await executeQuery(QUERIES.INSERT_PUBLISHER, [publisherNameBody]);
          publisherId = insertPublisher?.[0]?.id ?? null;
          if (publisherId == null) return res.status(500).json({ error: 'Error al crear editorial' });
        }
      }
      if (publisherId == null) return res.status(400).json({ error: 'Se requiere codiEditorial_id o publisherName' });

      const titulo = (body.titulo || '').trim() || '';
      const tituloOriginal = (body.tituloOriginal || '').trim() || null;
      const anyoEdicion = body.anyoEdicion != null && body.anyoEdicion !== '' ? Number(body.anyoEdicion) : null;
      const numeroEdicion = body.numeroEdicion != null && body.numeroEdicion !== '' ? Number(body.numeroEdicion) : 1;
      const numeroPaginas = body.numeroPaginas != null && body.numeroPaginas !== '' ? Number(body.numeroPaginas) : 0;
      const numeroEjemplares = body.numeroEjemplares != null && body.numeroEjemplares !== '' ? Number(body.numeroEjemplares) : 1;
      const portada_cloudinary = (body.portada_cloudinary || '').trim() || null;
      const sinopsis = (body.sinopsis || '').trim() || null;
      const observaciones = (body.observaciones || '').trim() || null;
      const coleccion = (body.coleccion || '').trim() || null;
      const serie = (body.serie || '').trim() || null;
      const hastag = normalizarHastag(body.hastag);
      const codiUbicacion_id = body.codiUbicacion_id != null && body.codiUbicacion_id !== '' ? Number(body.codiUbicacion_id) : null;
      const codiEstante_id = body.codiEstante_id != null && body.codiEstante_id !== '' ? Number(body.codiEstante_id) : null;
      const codiSoporte_id = body.codiSoporte_id != null && body.codiSoporte_id !== '' ? Number(body.codiSoporte_id) : null;

      await executeQuery(QUERIES.UPDATE_BOOK, [
        EAN, titulo, tituloOriginal, anyoEdicion, numeroEdicion, numeroPaginas, numeroEjemplares,
        portada_cloudinary, sinopsis, observaciones, coleccion, serie, hastag,
        codiUbicacion_id, codiEstante_id, codiSoporte_id,
        authorId, publisherId, bookId,
      ]);
      const updated = await executeQuery(QUERIES.GET_BOOK_BY_ID, [bookId]);
      return res.status(200).json(sanitizeBook(updated[0]));
    }

    // ---------- DELETE (borrado): solo books con id; requiere staff ----------
    if (req.method === 'DELETE' && segment === 'books' && id) {
      const user = requireStaff(req);
      if (!user) {
        return res.status(401).json({ error: 'No autorizado. Se requiere sesión de staff.' });
      }
      const bookId = Number(id);
      if (!Number.isInteger(bookId)) return res.status(404).json({ error: 'Book not found' });

      const existingBooks = await executeQuery(QUERIES.GET_BOOK_BY_ID, [bookId]);
      if (!existingBooks?.length) return res.status(404).json({ error: 'Book not found' });

      await executeQuery('DELETE FROM core_titulos WHERE id = ?', [bookId]);
      return res.status(204).end();
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
      const { search, searchBy = 'titulo', letter, filterBy = 'titulo', hastag: hastagParam, tipo: tipoParam } = req.query;
      let query, params = [];
      const hastagTag = hastagParam != null && String(hastagParam).trim() !== ''
        ? '#' + String(hastagParam).trim().replace(/^#+/, '')
        : null;
      const tipoSlug = normalizarTipoSlug(tipoParam);

      if (hastagTag) {
        query = tipoSlug ? QUERIES.GET_BOOKS_BY_HASTAG_BY_TIPO : QUERIES.GET_BOOKS_BY_HASTAG;
        params = tipoSlug ? [tipoSlug, hastagTag] : [hastagTag];
      } else if (search) {
        const searchPattern = `%${search}%`;
        if (tipoSlug) {
          query = searchBy === 'autor' ? QUERIES.SEARCH_BOOKS_BY_AUTHOR_BY_TIPO : QUERIES.SEARCH_BOOKS_BY_TITLE_BY_TIPO;
          params = [tipoSlug, searchPattern];
        } else {
          query = searchBy === 'autor' ? QUERIES.SEARCH_BOOKS_BY_AUTHOR : QUERIES.SEARCH_BOOKS_BY_TITLE;
          params = [searchPattern];
        }
      } else if (letter) {
        const letterPattern = `${letter}%`;
        if (tipoSlug) {
          query = filterBy === 'autor' ? QUERIES.FILTER_BOOKS_BY_LETTER_AUTHOR_BY_TIPO : QUERIES.FILTER_BOOKS_BY_LETTER_TITLE_BY_TIPO;
          params = [tipoSlug, letterPattern];
        } else {
          query = filterBy === 'autor' ? QUERIES.FILTER_BOOKS_BY_LETTER_AUTHOR : QUERIES.FILTER_BOOKS_BY_LETTER_TITLE;
          params = [letterPattern];
        }
      } else {
        query = tipoSlug ? QUERIES.GET_ALL_BOOKS_BY_TIPO : QUERIES.GET_ALL_BOOKS;
        params = tipoSlug ? [tipoSlug] : [];
      }
      const filterApplied = {
        sqlCondition: tipoSlug ? 'WHERE tc.slug = ? (JOIN core_soportes + core_tipos_coleccion)' : 'Sin filtro por tipo',
        tipoParam: tipoSlug,
        params,
      };
      let books = await executeQuery(query, params);
      // Fallback: si filtro por tipo y no hay resultados, probar slug sin tildes (p. ej. "musica" en BD)
      if (tipoSlug && books.length === 0 && !hastagTag && !search && !letter) {
        const slugAlt = slugSinAcentos(tipoSlug);
        if (slugAlt && slugAlt !== tipoSlug) {
          const paramsAlt = [slugAlt];
          books = await executeQuery(QUERIES.GET_ALL_BOOKS_BY_TIPO, paramsAlt);
        }
      }
      const sanitized = books.map(sanitizeBook);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      return res.status(200).json({
        data: sanitized,
        total: sanitized.length,
        filters: { search: search || null, searchBy, letter: letter || null, filterBy, hastag: hastagTag || null, tipo: tipoSlug || null },
        filterApplied,
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

    // GET /api/media/ubicaciones (lista para selector en edición)
    if (segment === 'ubicaciones') {
      const rows = await executeQuery(QUERIES.GET_UBICACIONES);
      return res.status(200).json({ data: rows || [], total: (rows || []).length });
    }

    // GET /api/media/estantes (lista para selector en edición)
    if (segment === 'estantes') {
      const rows = await executeQuery(QUERIES.GET_ESTANTES);
      return res.status(200).json({ data: rows || [], total: (rows || []).length });
    }

    // GET /api/media/soportes (lista para selector en alta/edición)
    if (segment === 'soportes') {
      const rows = await executeQuery(QUERIES.GET_SOPORTES);
      return res.status(200).json({ data: rows || [], total: (rows || []).length });
    }

    // Sin segmento o segmento desconocido: por defecto listar libros (compatibilidad con /api/media/books)
    if (!segment || segment === '') {
      const { search, searchBy = 'titulo', letter, filterBy = 'titulo', hastag: hastagParam, tipo: tipoParam } = req.query;
      let query, params = [];
      const hastagTag = hastagParam != null && String(hastagParam).trim() !== ''
        ? '#' + String(hastagParam).trim().replace(/^#+/, '')
        : null;
      const tipoSlug = normalizarTipoSlug(tipoParam);
      if (hastagTag) {
        query = tipoSlug ? QUERIES.GET_BOOKS_BY_HASTAG_BY_TIPO : QUERIES.GET_BOOKS_BY_HASTAG;
        params = tipoSlug ? [tipoSlug, hastagTag] : [hastagTag];
      } else if (search) {
        const searchPattern = `%${search}%`;
        if (tipoSlug) {
          query = searchBy === 'autor' ? QUERIES.SEARCH_BOOKS_BY_AUTHOR_BY_TIPO : QUERIES.SEARCH_BOOKS_BY_TITLE_BY_TIPO;
          params = [tipoSlug, searchPattern];
        } else {
          query = searchBy === 'autor' ? QUERIES.SEARCH_BOOKS_BY_AUTHOR : QUERIES.SEARCH_BOOKS_BY_TITLE;
          params = [searchPattern];
        }
      } else if (letter) {
        const letterPattern = `${letter}%`;
        if (tipoSlug) {
          query = filterBy === 'autor' ? QUERIES.FILTER_BOOKS_BY_LETTER_AUTHOR_BY_TIPO : QUERIES.FILTER_BOOKS_BY_LETTER_TITLE_BY_TIPO;
          params = [tipoSlug, letterPattern];
        } else {
          query = filterBy === 'autor' ? QUERIES.FILTER_BOOKS_BY_LETTER_AUTHOR : QUERIES.FILTER_BOOKS_BY_LETTER_TITLE;
          params = [letterPattern];
        }
      } else {
        query = tipoSlug ? QUERIES.GET_ALL_BOOKS_BY_TIPO : QUERIES.GET_ALL_BOOKS;
        params = tipoSlug ? [tipoSlug] : [];
      }
      const filterApplied = {
        sqlCondition: tipoSlug ? 'WHERE tc.slug = ? (JOIN core_soportes + core_tipos_coleccion)' : 'Sin filtro por tipo',
        tipoParam: tipoSlug,
        params,
      };
      let books = await executeQuery(query, params);
      if (tipoSlug && books.length === 0 && !hastagTag && !search && !letter) {
        const slugAlt = slugSinAcentos(tipoSlug);
        if (slugAlt && slugAlt !== tipoSlug) {
          books = await executeQuery(QUERIES.GET_ALL_BOOKS_BY_TIPO, [slugAlt]);
        }
      }
      const sanitized = books.map(sanitizeBook);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      return res.status(200).json({
        data: sanitized,
        total: sanitized.length,
        filters: { search: search || null, searchBy, letter: letter || null, filterBy, hastag: hastagTag || null, tipo: tipoSlug || null },
        filterApplied,
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
