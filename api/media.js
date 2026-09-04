/**
 * Una sola función para /api/media y /api/media/* (books, authors, publishers, stats).
 * Las peticiones a /api/media/books, /api/media/books/123, etc. se reescriben a /api/media?path=...
 */

import { executeQuery, executePipeline } from "./lib/turso.js";
import { QUERIES } from "./lib/queries.js";
import { requireStaff } from "./lib/auth.js";

function cors(res) {
  return res.status(200).json({});
}

/**
 * Normaliza el slug de tipo de colección: decodifica si viene codificado y unifica a NFC (Unicode).
 * Así coincidimos con el valor almacenado en core_tipos_coleccion.slug (ej. "música").
 */
function normalizarTipoSlug(val) {
  if (val == null || String(val).trim() === "") return null;
  let s = String(val).trim();
  try {
    if (s.includes("%")) s = decodeURIComponent(s);
  } catch (_) {}
  s = s.normalize("NFC").trim();
  return s || null;
}

/** Slug sin tildes/ñ para fallback si en BD está guardado así (ej. "musica" en vez de "música"). */
function slugSinAcentos(slug) {
  if (!slug || typeof slug !== "string") return slug;
  return slug
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ñ/gi, "n");
}

/** Identificador interno para videoteca cuando no hay EAN físico (máx. 13 caracteres). */
function generateVideoEan(body) {
  const tmdbId = body.tmdbId ?? body.tmdb_id;
  const tipo = (body.tmdbType ?? body.tmdb_type ?? "").toLowerCase();
  const season = body.seasonNumber ?? body.season_number;
  if (tmdbId != null && tipo === "movie") {
    return `M${String(tmdbId).padStart(12, "0")}`.slice(0, 13);
  }
  if (tmdbId != null && tipo === "tv" && season != null) {
    const sid = String(tmdbId).padStart(7, "0");
    const ss = String(season).padStart(2, "0");
    return `T${sid}S${ss}`.slice(0, 13);
  }
  const tvmazeId = body.tvmazeId ?? body.tvmaze_id;
  if (tvmazeId != null && season != null) {
    return `Z${String(tvmazeId).padStart(6, "0")}S${String(season).padStart(2, "0")}`.slice(0, 13);
  }
  return `V${Date.now().toString(36).toUpperCase()}`.slice(0, 13);
}

/** Identificador interno para libros cuando no hay ISBN/EAN físico (máx. 13 caracteres). */
function generateLibroEan() {
  return `L${Date.now().toString(36).toUpperCase()}`.slice(0, 13);
}

/**
 * Resuelve slug de tipo → id cargando todos los tipos y emparejando en JS (normalizado).
 * Así siempre filtramos por id y evitamos desajustes por encoding o slug distinto en BD.
 */
async function resolveTipoSlugToId(tipoSlug) {
  if (!tipoSlug || typeof tipoSlug !== "string") return null;
  const tipos = await executeQuery(QUERIES.GET_TIPOS_COLECCION);
  if (!Array.isArray(tipos) || tipos.length === 0) return null;
  const slugNorm = tipoSlug.normalize("NFC").replace(/[\t\r\n]+/g, "").trim();
  const slugAlt = slugSinAcentos(slugNorm);
  const found = tipos.find((tc) => {
    const s = (tc.slug ?? "").normalize("NFC").replace(/[\t\r\n]+/g, "").trim();
    return s === slugNorm || slugSinAcentos(s) === slugAlt;
  });
  return found?.id != null ? found.id : null;
}

/** Añade # al inicio de cada palabra si no empieza por almohadilla (ASC 35) */
function normalizarHastag(texto) {
  if (texto == null || typeof texto !== "string") return null;
  const t = texto.trim();
  if (!t) return null;
  return t
    .split(/\s+/)
    .map((w) => (w.charAt(0) === "#" ? w : "#" + w))
    .join(" ");
}

/** Normaliza MBID de release (UUID) desde texto o URL de musicbrainz.org */
function normalizeMusicbrainzReleaseMbid(v) {
  const s = (v == null ? "" : String(v)).trim();
  if (!s) return null;
  const m = s.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
  return m ? m[0].toLowerCase() : null;
}

/** Seis placeholders LIKE idénticos para SEARCH_BOOKS_SMART_OBRA* (EAN, títulos, hastag, MBID, nº sello). */
function buildSmartObraLikeParams(search) {
  const raw = search == null ? "" : String(search).trim();
  const searchPattern = `%${raw}%`;
  return [
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
  ];
}

function sanitizeBook(book) {
  return {
    ...book,
    titulo: book.titulo || "",
    tituloOriginal: book.tituloOriginal ?? null,
    nombreAutor: book.nombreAutor || "",
    editorial: book.editorial || "",
    sinopsis: book.sinopsis ?? null,
    observaciones: book.observaciones ?? null,
    coleccion: book.coleccion ?? null,
    serie: book.serie ?? null,
    hastag: book.hastag ?? null,
    ubicacionDesc: book.ubicacionDesc ?? null,
    estanteDesc: book.estanteDesc ?? null,
    soporteDesc: book.soporteDesc ?? null,
    musicbrainz_release_mbid: book.musicbrainz_release_mbid ?? null,
    numero_catalogo_sello: book.numero_catalogo_sello ?? null,
  };
}

/** Listado: sin sinopsis (reduce mucho el JSON; la ficha la pide por id). */
function sanitizeBookListItem(book) {
  const { sinopsis, observaciones, ...rest } = sanitizeBook(book);
  return rest;
}

function normTemaText(v) {
  return v == null || v === "" ? null : String(v).trim() || null;
}

function parseTemaVolumen(v) {
  if (v == null || v === "") return 1;
  return Math.max(1, parseInt(v, 10) || 1);
}

/** Compara campos de negocio de un título (ignora created/updated/id). */
function bookFieldsEqual(existing, next) {
  const n = (v) => (v == null || v === "" ? null : String(v).trim());
  const ni = (v) => {
    if (v == null || v === "") return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  };
  return (
    n(existing.EAN) === n(next.EAN) &&
    n(existing.titulo) === n(next.titulo) &&
    n(existing.tituloOriginal) === n(next.tituloOriginal) &&
    ni(existing.anyoEdicion) === ni(next.anyoEdicion) &&
    ni(existing.numeroEdicion) === ni(next.numeroEdicion) &&
    ni(existing.numeroPaginas) === ni(next.numeroPaginas) &&
    ni(existing.numeroEjemplares) === ni(next.numeroEjemplares) &&
    n(existing.portada_cloudinary) === n(next.portada_cloudinary) &&
    n(existing.sinopsis) === n(next.sinopsis) &&
    n(existing.observaciones) === n(next.observaciones) &&
    n(existing.coleccion) === n(next.coleccion) &&
    n(existing.serie) === n(next.serie) &&
    n(existing.hastag) === n(next.hastag) &&
    n(existing.musicbrainz_release_mbid) === n(next.musicbrainz_release_mbid) &&
    n(existing.numero_catalogo_sello) === n(next.numero_catalogo_sello) &&
    ni(existing.codiUbicacion_id) === ni(next.codiUbicacion_id) &&
    n(existing.codiEstante_id) === n(next.codiEstante_id) &&
    ni(existing.codiSoporte_id) === ni(next.codiSoporte_id) &&
    ni(existing.codiAutor_id) === ni(next.codiAutor_id) &&
    ni(existing.codiEditorial_id) === ni(next.codiEditorial_id)
  );
}

/**
 * Sincroniza core_temas de un título sin regenerar created.
 * - INSERT solo filas nuevas (created = updated = ahora)
 * - UPDATE solo si el contenido cambia (updated = ahora; created intacto)
 * - DELETE solo las que ya no vienen en el payload
 */
async function syncTemasForTitulo(tituloId, temasIncoming) {
  const existing = await executeQuery(QUERIES.GET_TEMAS_BY_TITULO_ID, [tituloId]);
  const byNumero = new Map();
  for (const row of existing || []) {
    byNumero.set(Number(row.numero), row);
  }

  const incomingNumeros = new Set();
  const list = Array.isArray(temasIncoming) ? temasIncoming : [];

  for (const t of list) {
    const num = t.numero != null ? Number(t.numero) : 0;
    const tit = (t.titulo || "").trim() || "";
    const dur = normTemaText(t.duracion);
    const enlace = normTemaText(t.enlace);
    const vol = parseTemaVolumen(t.numeroVolumen);
    if (!(num > 0 && tit)) continue;

    incomingNumeros.add(num);
    const prev = byNumero.get(num);
    if (prev) {
      const prevDur = normTemaText(prev.duracion);
      const prevEnlace = normTemaText(prev.enlace);
      const prevVol = parseTemaVolumen(prev.numeroVolumen);
      const prevTit = String(prev.nombreTema ?? "").trim();
      const same =
        prevTit === tit &&
        prevDur === dur &&
        prevEnlace === enlace &&
        prevVol === vol &&
        Number(prev.numero) === num;
      if (!same) {
        await executeQuery(QUERIES.UPDATE_TEMA, [
          num,
          tit,
          dur,
          enlace,
          vol,
          prev.id,
        ]);
      }
    } else {
      await executeQuery(QUERIES.INSERT_TEMA, [
        tituloId,
        num,
        tit,
        dur,
        enlace,
        vol,
      ]);
    }
  }

  for (const row of existing || []) {
    if (!incomingNumeros.has(Number(row.numero))) {
      await executeQuery(QUERIES.DELETE_TEMA_BY_ID, [row.id]);
    }
  }
}

async function enrichBooksWithCopies(books) {
  if (!Array.isArray(books) || books.length === 0) return books;
  const ids = books
    .map((book) => Number(book?.id))
    .filter((id) => Number.isInteger(id));
  if (ids.length === 0) return books;

  const placeholders = ids.map(() => "?").join(", ");
  const rows = await executeQuery(
    `SELECT id, numeroEjemplares FROM core_titulos WHERE id IN (${placeholders})`,
    ids,
  );
  const ejemplaresPorId = new Map(
    (rows || []).map((row) => [Number(row.id), Number(row.numeroEjemplares ?? 1)]),
  );

  return books.map((book) => {
    const id = Number(book?.id);
    if (!Number.isInteger(id)) return book;
    return {
      ...book,
      numeroEjemplares: ejemplaresPorId.get(id) ?? Number(book.numeroEjemplares ?? 1),
    };
  });
}

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") return cors(res);

    // path viene del rewrite: /api/media/books -> ?path=books, /api/media/books/123 -> ?path=books/123
    const pathParam = req.query.path || "";
    const pathSegments =
      typeof pathParam === "string" ? pathParam.split("/").filter(Boolean) : [];
    const segment = pathSegments[0];
    const id = pathSegments.length > 1 ? pathSegments[1] : req.query.id;

    // ---------- POST (altas): solo books, authors, publishers; sin id en path ----------
    if (req.method === "POST") {
      if (
        !["books", "authors", "publishers"].includes(segment) ||
        pathSegments.length > 1
      ) {
        return res.status(404).json({ error: "Not found" });
      }
      const user = requireStaff(req);
      if (!user) {
        return res
          .status(401)
          .json({ error: "No autorizado. Se requiere sesión de staff." });
      }
      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};

      if (segment === "authors") {
        const nombreAutor = (body.nombreAutor || "").trim();
        if (!nombreAutor)
          return res.status(400).json({ error: "nombreAutor es obligatorio" });
        const rows = await executeQuery(QUERIES.INSERT_AUTHOR, [
          nombreAutor,
          (body.enlaceWiki || "").trim() || null,
          (body.enlaceWiki2 || "").trim() || null,
        ]);
        const newId = rows?.[0]?.id;
        if (newId == null)
          return res.status(500).json({ error: "Error al crear autor" });
        return res.status(201).json({ id: newId });
      }

      if (segment === "publishers") {
        const descriEditorial = (body.descriEditorial || "").trim();
        if (!descriEditorial)
          return res
            .status(400)
            .json({ error: "descriEditorial es obligatorio" });
        const rows = await executeQuery(QUERIES.INSERT_PUBLISHER, [
          descriEditorial,
        ]);
        const newId = rows?.[0]?.id;
        if (newId == null)
          return res.status(500).json({ error: "Error al crear editorial" });
        return res.status(201).json({ id: newId });
      }

      if (segment === "books") {
        const isVideo = Boolean(body.videoMode);
        const isDisco =
          !isVideo && Array.isArray(body.temas) && body.temas.length > 0;
        let EAN = (body.EAN || "").replace(/-/g, "").trim();
        if (!EAN && isVideo) {
          EAN = generateVideoEan(body);
        } else if (!EAN && !isDisco) {
          // Libros sin ISBN/EAN físico: identificador interno (como videoteca)
          EAN = generateLibroEan();
        }
        if (!EAN) return res.status(400).json({ error: "EAN es obligatorio" });
        const existingBook = await executeQuery(QUERIES.GET_BOOK_ID_BY_EAN, [
          EAN,
        ]);
        if (existingBook?.length > 0) {
          return res
            .status(400)
            .json({ error: "Ya existe un libro con este ISBN/EAN" });
        }

        const authorNameBody = (body.authorName || "").trim();
        const publisherNameBody = (body.publisherName || "").trim();
        const codiAutor_id =
          body.codiAutor_id != null ? Number(body.codiAutor_id) : null;
        const codiEditorial_id =
          body.codiEditorial_id != null ? Number(body.codiEditorial_id) : null;
        const addNewAuthor = Boolean(body.addNewAuthor);
        const addNewPublisher = Boolean(body.addNewPublisher);
        const enlaceWikiAuthor =
          (body.enlaceWiki || body.autorEnlaceWiki || "").trim() || null;
        const enlaceWiki2Author =
          (body.enlaceWiki2 || body.autorEnlaceWiki2 || "").trim() || null;

        let authorNameForBook = "";
        let publisherNameForBook = "";
        let needCreateAuthor = false;
        let needCreatePublisher = false;

        if (codiAutor_id && !authorNameBody) {
          const authorRow = await executeQuery(QUERIES.GET_AUTHOR_BY_ID, [
            codiAutor_id,
          ]);
          if (!authorRow?.length)
            return res.status(400).json({ error: "Autor no encontrado" });
          authorNameForBook = authorRow[0].nombreAutor || "";
        } else if (authorNameBody) {
          const existingAuthor = await executeQuery(
            QUERIES.GET_AUTHOR_ID_BY_NAME,
            [authorNameBody],
          );
          if (existingAuthor?.length > 0) {
            authorNameForBook = authorNameBody;
          } else {
            authorNameForBook = authorNameBody;
            needCreateAuthor = true;
          }
        }
        if (!authorNameForBook)
          return res
            .status(400)
            .json({ error: "Se requiere codiAutor_id o authorName" });

        if (codiEditorial_id && !publisherNameBody) {
          const publisherRow = await executeQuery(QUERIES.GET_PUBLISHER_BY_ID, [
            codiEditorial_id,
          ]);
          if (!publisherRow?.length)
            return res.status(400).json({ error: "Editorial no encontrada" });
          publisherNameForBook = publisherRow[0].descriEditorial || "";
        } else if (publisherNameBody) {
          const existingPublisher = await executeQuery(
            QUERIES.GET_PUBLISHER_ID_BY_NAME,
            [publisherNameBody],
          );
          if (existingPublisher?.length > 0) {
            publisherNameForBook = publisherNameBody;
          } else {
            publisherNameForBook = publisherNameBody;
            needCreatePublisher = true;
          }
        }
        // Para discoteca/videoteca la editorial puede ser opcional
        if (!publisherNameForBook && !isDisco && !isVideo)
          return res
            .status(400)
            .json({ error: "Se requiere codiEditorial_id o publisherName" });
        if ((isDisco || isVideo) && !publisherNameForBook)
          publisherNameForBook = "— Sin editorial —";

        const titulo = (body.titulo || "").trim() || "";
        const tituloOriginal = (body.tituloOriginal || "").trim() || null;
        const anyoEdicion =
          body.anyoEdicion != null && body.anyoEdicion !== ""
            ? Number(body.anyoEdicion)
            : null;
        const numeroEdicion =
          body.numeroEdicion != null && body.numeroEdicion !== ""
            ? Number(body.numeroEdicion)
            : 1;
        const numeroPaginas =
          body.numeroPaginas != null && body.numeroPaginas !== ""
            ? Number(body.numeroPaginas)
            : 0;
        const numeroEjemplares =
          body.numeroEjemplares != null && body.numeroEjemplares !== ""
            ? Number(body.numeroEjemplares)
            : 1;
        const portada_cloudinary =
          (body.portada_cloudinary || "").trim() || null;
        const sinopsis = (body.sinopsis || "").trim() || null;
        const observaciones = (body.observaciones || "").trim() || null;
        const coleccion = (body.coleccion || "").trim() || null;
        const serie = (body.serie || "").trim() || null;
        const hastag = normalizarHastag(body.hastag);
        const musicbrainz_release_mbid = normalizeMusicbrainzReleaseMbid(
          body.musicbrainz_release_mbid ?? body.musicbrainzReleaseMbid,
        );
        const numero_catalogo_sello =
          (body.numero_catalogo_sello || "").trim() || null;
        const codiUbicacion_id =
          body.codiUbicacion_id != null && body.codiUbicacion_id !== ""
            ? Number(body.codiUbicacion_id)
            : null;
        const codiEstante_id =
          body.codiEstante_id != null && body.codiEstante_id !== ""
            ? typeof body.codiEstante_id === "string"
              ? body.codiEstante_id.trim()
              : body.codiEstante_id
            : null;
        const codiSoporte_id =
          body.codiSoporte_id != null && body.codiSoporte_id !== ""
            ? Number(body.codiSoporte_id)
            : null;

        const bookParams = [
          EAN,
          titulo,
          tituloOriginal,
          anyoEdicion,
          numeroEdicion,
          numeroPaginas,
          numeroEjemplares,
          portada_cloudinary,
          sinopsis,
          observaciones,
          coleccion,
          serie,
          hastag,
          musicbrainz_release_mbid,
          numero_catalogo_sello,
          codiUbicacion_id,
          codiEstante_id,
          codiSoporte_id,
          authorNameForBook,
          publisherNameForBook,
        ];

        const pipelineStatements = [];
        if (needCreateAuthor) {
          pipelineStatements.push({
            sql: QUERIES.INSERT_AUTHOR,
            params: [authorNameForBook, enlaceWikiAuthor, enlaceWiki2Author],
          });
        }
        if (needCreatePublisher) {
          pipelineStatements.push({
            sql: QUERIES.INSERT_PUBLISHER,
            params: [publisherNameForBook],
          });
        }
        pipelineStatements.push({
          sql: QUERIES.INSERT_BOOK_BY_AUTHOR_AND_PUBLISHER_NAME,
          params: bookParams,
        });

        const pipelineResults = await executePipeline(pipelineStatements);
        const withRows = pipelineResults.filter((r) => r.rows?.length > 0);
        const bookResult = withRows[withRows.length - 1];
        const idCell = bookResult?.rows?.[0]?.[0];
        const newId = idCell != null ? Number(idCell) : null;
        if (newId == null)
          return res.status(500).json({ error: "Error al crear libro" });

        // Si se envían temas (pistas/capítulos), insertar en core_temas (alta: solo INSERT)
        const temas = Array.isArray(body.temas) ? body.temas : [];
        for (const t of temas) {
          const num = t.numero != null ? Number(t.numero) : 0;
          const tit = (t.titulo || "").trim() || "";
          const dur = normTemaText(t.duracion);
          const enlace = normTemaText(t.enlace);
          const vol = parseTemaVolumen(t.numeroVolumen);
          if (num > 0 && tit) {
            await executeQuery(QUERIES.INSERT_TEMA, [newId, num, tit, dur, enlace, vol]);
          }
        }
        return res.status(201).json({ id: newId });
      }
    }

    // ---------- PUT (edición): solo books con id; requiere staff; se sincroniza en Turso (LWW en app escritorio) ----------
    if (req.method === "PUT" && segment === "books" && id) {
      const user = requireStaff(req);
      if (!user) {
        return res
          .status(401)
          .json({ error: "No autorizado. Se requiere sesión de staff." });
      }
      const bookId = Number(id);
      if (!Number.isInteger(bookId))
        return res.status(404).json({ error: "Book not found" });

      const existingBooks = await executeQuery(QUERIES.GET_BOOK_BY_ID, [
        bookId,
      ]);
      if (!existingBooks?.length)
        return res.status(404).json({ error: "Book not found" });

      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};
      const EAN = (body.EAN || "").replace(/-/g, "").trim();
      if (!EAN) return res.status(400).json({ error: "EAN es obligatorio" });

      const existingByEan = await executeQuery(QUERIES.GET_BOOK_ID_BY_EAN, [
        EAN,
      ]);
      if (existingByEan?.length > 0 && Number(existingByEan[0].id) !== bookId) {
        return res
          .status(400)
          .json({ error: "Ya existe otro libro con este ISBN/EAN" });
      }

      const authorNameBody = (body.authorName || "").trim();
      const publisherNameBody = (body.publisherName || "").trim();
      const codiAutor_id =
        body.codiAutor_id != null ? Number(body.codiAutor_id) : null;
      const codiEditorial_id =
        body.codiEditorial_id != null ? Number(body.codiEditorial_id) : null;
      const addNewAuthor = Boolean(body.addNewAuthor);
      const addNewPublisher = Boolean(body.addNewPublisher);

      let authorId = null;
      let publisherId = null;

      if (codiAutor_id && !authorNameBody) {
        const authorRow = await executeQuery(QUERIES.GET_AUTHOR_BY_ID, [
          codiAutor_id,
        ]);
        if (!authorRow?.length)
          return res.status(400).json({ error: "Autor no encontrado" });
        authorId = codiAutor_id;
      } else if (authorNameBody) {
        const existingAuthor = await executeQuery(
          QUERIES.GET_AUTHOR_ID_BY_NAME,
          [authorNameBody],
        );
        if (existingAuthor?.length > 0) {
          authorId = existingAuthor[0].id;
        } else {
          if (!addNewAuthor)
            return res
              .status(400)
              .json({
                error:
                  'Se requiere codiAutor_id o authorName (o marcar "Añadir como nuevo")',
              });
          const insertAuthor = await executeQuery(QUERIES.INSERT_AUTHOR, [
            authorNameBody,
            null,
            null,
          ]);
          authorId = insertAuthor?.[0]?.id ?? null;
          if (authorId == null)
            return res.status(500).json({ error: "Error al crear autor" });
        }
      }
      if (authorId == null)
        return res
          .status(400)
          .json({ error: "Se requiere codiAutor_id o authorName" });

      if (codiEditorial_id && !publisherNameBody) {
        const publisherRow = await executeQuery(QUERIES.GET_PUBLISHER_BY_ID, [
          codiEditorial_id,
        ]);
        if (!publisherRow?.length)
          return res.status(400).json({ error: "Editorial no encontrada" });
        publisherId = codiEditorial_id;
      } else if (publisherNameBody) {
        const existingPublisher = await executeQuery(
          QUERIES.GET_PUBLISHER_ID_BY_NAME,
          [publisherNameBody],
        );
        if (existingPublisher?.length > 0) {
          publisherId = existingPublisher[0].id;
        } else {
          if (!addNewPublisher)
            return res
              .status(400)
              .json({
                error:
                  'Se requiere codiEditorial_id o publisherName (o marcar "Añadir como nuevo")',
              });
          const insertPublisher = await executeQuery(QUERIES.INSERT_PUBLISHER, [
            publisherNameBody,
          ]);
          publisherId = insertPublisher?.[0]?.id ?? null;
          if (publisherId == null)
            return res.status(500).json({ error: "Error al crear editorial" });
        }
      }
      if (publisherId == null)
        return res
          .status(400)
          .json({ error: "Se requiere codiEditorial_id o publisherName" });

      const titulo = (body.titulo || "").trim() || "";
      const tituloOriginal = (body.tituloOriginal || "").trim() || null;
      const anyoEdicion =
        body.anyoEdicion != null && body.anyoEdicion !== ""
          ? Number(body.anyoEdicion)
          : null;
      const numeroEdicion =
        body.numeroEdicion != null && body.numeroEdicion !== ""
          ? Number(body.numeroEdicion)
          : 1;
      const numeroPaginas =
        body.numeroPaginas != null && body.numeroPaginas !== ""
          ? Number(body.numeroPaginas)
          : 0;
      const numeroEjemplares =
        body.numeroEjemplares != null && body.numeroEjemplares !== ""
          ? Number(body.numeroEjemplares)
          : 1;
      const portada_cloudinary = (body.portada_cloudinary || "").trim() || null;
      const sinopsis = (body.sinopsis || "").trim() || null;
      const observaciones = (body.observaciones || "").trim() || null;
      const coleccion = (body.coleccion || "").trim() || null;
      const serie = (body.serie || "").trim() || null;
      const hastag = normalizarHastag(body.hastag);
      const musicbrainz_release_mbid = normalizeMusicbrainzReleaseMbid(
        body.musicbrainz_release_mbid ?? body.musicbrainzReleaseMbid,
      );
      const numero_catalogo_sello =
        (body.numero_catalogo_sello || "").trim() || null;
      const codiUbicacion_id =
        body.codiUbicacion_id != null && body.codiUbicacion_id !== ""
          ? Number(body.codiUbicacion_id)
          : null;
      // codiEstante_id referencia core_ubicaciones_sub.codiEstante: puede ser TEXT (ej. "0106"). No convertir a Number para no romper FK.
      const codiEstante_id =
        body.codiEstante_id != null && body.codiEstante_id !== ""
          ? typeof body.codiEstante_id === "string"
            ? body.codiEstante_id.trim()
            : body.codiEstante_id
          : null;
      const codiSoporte_id =
        body.codiSoporte_id != null && body.codiSoporte_id !== ""
          ? Number(body.codiSoporte_id)
          : null;

      // Validar FKs antes del UPDATE para devolver error claro si alguna no existe
      if (codiUbicacion_id != null) {
        const u = await executeQuery(
          "SELECT 1 FROM core_ubicaciones WHERE id = ? LIMIT 1",
          [codiUbicacion_id],
        );
        if (!u?.length)
          return res
            .status(400)
            .json({
              error: "Ubicación seleccionada no existe en la base de datos.",
            });
      }
      if (codiEstante_id != null) {
        const e = await executeQuery(
          "SELECT 1 FROM core_ubicaciones_sub WHERE codiEstante = ? LIMIT 1",
          [codiEstante_id],
        );
        if (!e?.length)
          return res
            .status(400)
            .json({
              error:
                "Estante seleccionado no existe en la base de datos. Si el código es numérico (ej. 0106), no debe convertirse a número.",
            });
      }
      if (codiSoporte_id != null) {
        const s = await executeQuery(
          "SELECT 1 FROM core_soportes WHERE id = ? LIMIT 1",
          [codiSoporte_id],
        );
        if (!s?.length)
          return res
            .status(400)
            .json({
              error: "Soporte seleccionado no existe en la base de datos.",
            });
      }

      const nextBook = {
        EAN,
        titulo,
        tituloOriginal,
        anyoEdicion,
        numeroEdicion,
        numeroPaginas,
        numeroEjemplares,
        portada_cloudinary,
        sinopsis,
        observaciones,
        coleccion,
        serie,
        hastag,
        musicbrainz_release_mbid,
        numero_catalogo_sello,
        codiUbicacion_id,
        codiEstante_id,
        codiSoporte_id,
        codiAutor_id: authorId,
        codiEditorial_id: publisherId,
      };
      // Solo tocar updated si hay cambio real en el título (nunca tocar created)
      if (!bookFieldsEqual(existingBooks[0], nextBook)) {
        await executeQuery(QUERIES.UPDATE_BOOK, [
          EAN,
          titulo,
          tituloOriginal,
          anyoEdicion,
          numeroEdicion,
          numeroPaginas,
          numeroEjemplares,
          portada_cloudinary,
          sinopsis,
          observaciones,
          coleccion,
          serie,
          hastag,
          musicbrainz_release_mbid,
          numero_catalogo_sello,
          codiUbicacion_id,
          codiEstante_id,
          codiSoporte_id,
          authorId,
          publisherId,
          bookId,
        ]);
      }
      // Temas: upsert (preserva created; updated solo si hay cambio real)
      if (Array.isArray(body.temas)) {
        await syncTemasForTitulo(bookId, body.temas);
      }
      const updated = await executeQuery(QUERIES.GET_BOOK_BY_ID, [bookId]);
      return res.status(200).json(sanitizeBook(updated[0]));
    }

    // ---------- DELETE (borrado): solo books con id; requiere staff ----------
    if (req.method === "DELETE" && segment === "books" && id) {
      const user = requireStaff(req);
      if (!user) {
        return res
          .status(401)
          .json({ error: "No autorizado. Se requiere sesión de staff." });
      }
      const bookId = Number(id);
      if (!Number.isInteger(bookId))
        return res.status(404).json({ error: "Book not found" });

      const existingBooks = await executeQuery(QUERIES.GET_BOOK_BY_ID, [
        bookId,
      ]);
      if (!existingBooks?.length)
        return res.status(404).json({ error: "Book not found" });

      // Cascada explícita (hijos antes que padre) + FK ON DELETE CASCADE en BD
      await executeQuery("DELETE FROM core_temas WHERE codiTitulo_id = ?", [
        bookId,
      ]);
      try {
        await executeQuery(
          "DELETE FROM core_titulosleidos WHERE codiTitulo_id = ?",
          [bookId],
        );
      } catch (_) {
        // Tabla puede no existir en algún entorno
      }
      await executeQuery("DELETE FROM core_titulos WHERE id = ?", [bookId]);
      return res.status(204).end();
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // GET (listado, detalle con temas, stats): accesible sin autenticación.
    // La visualización de temas de cada disco y la reproducción (preview externa) son públicas.

    // GET /api/media/stats
    if (segment === "stats") {
      const rows = await executeQuery(QUERIES.GET_BOOKS_STATS);
      return res.status(200).json(rows[0] || {});
    }

    // GET /api/media/books y GET /api/media/books/:id
    if (segment === "books") {
      if (id) {
        const books = await executeQuery(QUERIES.GET_BOOK_BY_ID, [id]);
        if (!books?.length)
          return res.status(404).json({ error: "Book not found" });
        const book = sanitizeBook(books[0]);
        const temasRows = await executeQuery(QUERIES.GET_TEMAS_BY_TITULO_ID, [
          id,
        ]);
        if (temasRows?.length) {
          book.temas = temasRows.map((r) => ({
            id: r.id,
            numero: r.numero,
            titulo: r.nombreTema ?? "",
            duracion: r.duracion ?? "",
            enlace: r.enlace ?? "",
            numeroVolumen:
              r.numeroVolumen != null && r.numeroVolumen !== ""
                ? Number(r.numeroVolumen)
                : 1,
            created: r.created ?? null,
            updated: r.updated ?? null,
          }));
        } else {
          book.temas = [];
        }
        return res.status(200).json(book);
      }
      const {
        search,
        searchBy = "titulo",
        letter,
        filterBy = "titulo",
        hastag: hastagParam,
        tipo: tipoParam,
        limit: limitParam,
        offset: offsetParam,
      } = req.query;
      let query,
        params = [];
      const hastagTag =
        hastagParam != null && String(hastagParam).trim() !== ""
          ? "#" + String(hastagParam).trim().replace(/^#+/, "")
          : null;
      const tipoSlug = normalizarTipoSlug(tipoParam);
      // Siempre resolver slug → id cargando tipos y emparejando en JS (así filtramos siempre por id)
      const tipoId = tipoSlug ? await resolveTipoSlugToId(tipoSlug) : null;

      if (hastagTag) {
        if (tipoId != null) {
          query = QUERIES.GET_BOOKS_BY_HASTAG_BY_TIPO_ID;
          params = [tipoId, hastagTag];
        } else if (tipoSlug) {
          query = QUERIES.GET_BOOKS_BY_HASTAG_BY_TIPO;
          params = [tipoSlug, hastagTag];
        } else {
          query = QUERIES.GET_BOOKS_BY_HASTAG;
          params = [hastagTag];
        }
      } else if (search) {
        const searchPattern = `%${search}%`;
        const smartP = buildSmartObraLikeParams(search);
        if (tipoId != null) {
          query =
            searchBy === "autor"
              ? QUERIES.SEARCH_BOOKS_BY_AUTHOR_BY_TIPO_ID
              : QUERIES.SEARCH_BOOKS_SMART_OBRA_BY_TIPO_ID;
          params =
            searchBy === "autor"
              ? [tipoId, searchPattern]
              : [tipoId, ...smartP];
        } else if (tipoSlug) {
          query =
            searchBy === "autor"
              ? QUERIES.SEARCH_BOOKS_BY_AUTHOR_BY_TIPO
              : QUERIES.SEARCH_BOOKS_SMART_OBRA_BY_TIPO;
          params =
            searchBy === "autor"
              ? [tipoSlug, searchPattern]
              : [tipoSlug, ...smartP];
        } else {
          query =
            searchBy === "autor"
              ? QUERIES.SEARCH_BOOKS_BY_AUTHOR
              : QUERIES.SEARCH_BOOKS_SMART_OBRA;
          params = searchBy === "autor" ? [searchPattern] : smartP;
        }
      } else if (letter) {
        const letterPattern = `${letter}%`;
        if (tipoId != null) {
          query =
            filterBy === "autor"
              ? QUERIES.FILTER_BOOKS_BY_LETTER_AUTHOR_BY_TIPO_ID
              : QUERIES.FILTER_BOOKS_BY_LETTER_TITLE_BY_TIPO_ID;
          params = [tipoId, letterPattern];
        } else if (tipoSlug) {
          query =
            filterBy === "autor"
              ? QUERIES.FILTER_BOOKS_BY_LETTER_AUTHOR_BY_TIPO
              : QUERIES.FILTER_BOOKS_BY_LETTER_TITLE_BY_TIPO;
          params = [tipoSlug, letterPattern];
        } else {
          query =
            filterBy === "autor"
              ? QUERIES.FILTER_BOOKS_BY_LETTER_AUTHOR
              : QUERIES.FILTER_BOOKS_BY_LETTER_TITLE;
          params = [letterPattern];
        }
      } else {
        if (tipoId != null) {
          query = QUERIES.GET_ALL_BOOKS_BY_TIPO_ID;
          params = [tipoId];
        } else if (tipoSlug) {
          query = QUERIES.GET_ALL_BOOKS_BY_TIPO;
          params = [tipoSlug];
        } else {
          query = QUERIES.GET_ALL_BOOKS;
          params = [];
        }
      }
      const filterApplied = {
        sqlCondition: tipoSlug
          ? tipoId != null
            ? "WHERE tc.id = ? (JOIN core_soportes + core_tipos_coleccion)"
            : "WHERE tc.slug = ? (JOIN core_soportes + core_tipos_coleccion)"
          : "Sin filtro por tipo",
        tipoParam: tipoSlug,
        tipoId: tipoId ?? undefined,
        params,
      };
      let books = await executeQuery(query, params);
      if (
        tipoSlug &&
        tipoId == null &&
        books.length === 0 &&
        !hastagTag &&
        !search &&
        !letter
      ) {
        const slugAlt = slugSinAcentos(tipoSlug);
        if (slugAlt && slugAlt !== tipoSlug) {
          books = await executeQuery(QUERIES.GET_ALL_BOOKS_BY_TIPO, [slugAlt]);
        }
      }

      // Paginación en servidor para listados amplios (evita JSON de varios MB que corta el proxy).
      const useServerPage =
        !hastagTag && !search && !letter && limitParam != null && limitParam !== "";
      let total = books.length;
      if (useServerPage) {
        const lim = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 15));
        const off = Math.max(0, parseInt(offsetParam, 10) || 0);
        total = books.length;
        books = books.slice(off, off + lim);
      }

      const booksWithCopies = await enrichBooksWithCopies(books);
      const sanitized = booksWithCopies.map(sanitizeBookListItem);
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, max-age=0",
      );
      res.setHeader("Pragma", "no-cache");
      return res.status(200).json({
        data: sanitized,
        total,
        filters: {
          search: search || null,
          searchBy,
          letter: letter || null,
          filterBy,
          hastag: hastagTag || null,
          tipo: tipoSlug || null,
        },
        filterApplied,
      });
    }

    // GET /api/media/authors y GET /api/media/authors/:id
    if (segment === "authors") {
      if (id) {
        const authors = await executeQuery(QUERIES.GET_AUTHOR_BY_ID, [id]);
        if (!authors?.length)
          return res.status(404).json({ error: "Author not found" });
        return res.status(200).json(authors[0]);
      }
      const { search } = req.query;
      const query = search ? QUERIES.SEARCH_AUTHORS : QUERIES.GET_ALL_AUTHORS;
      const params = search ? [`%${search}%`] : [];
      const authors = await executeQuery(query, params);
      return res
        .status(200)
        .json({
          data: authors,
          total: authors.length,
          filters: { search: search || null },
        });
    }

    // GET /api/media/publishers y GET /api/media/publishers/:id
    if (segment === "publishers") {
      if (id) {
        const publishers = await executeQuery(QUERIES.GET_PUBLISHER_BY_ID, [
          id,
        ]);
        if (!publishers?.length)
          return res.status(404).json({ error: "Publisher not found" });
        return res.status(200).json(publishers[0]);
      }
      const { search } = req.query;
      const query = search
        ? QUERIES.SEARCH_PUBLISHERS
        : QUERIES.GET_ALL_PUBLISHERS;
      const params = search ? [`%${search}%`] : [];
      const publishers = await executeQuery(query, params);
      return res
        .status(200)
        .json({
          data: publishers,
          total: publishers.length,
          filters: { search: search || null },
        });
    }

    // GET /api/media/ubicaciones (lista para selector en edición)
    if (segment === "ubicaciones") {
      const rows = await executeQuery(QUERIES.GET_UBICACIONES);
      return res
        .status(200)
        .json({ data: rows || [], total: (rows || []).length });
    }

    // GET /api/media/estantes (lista para selector en edición)
    if (segment === "estantes") {
      const rows = await executeQuery(QUERIES.GET_ESTANTES);
      return res
        .status(200)
        .json({ data: rows || [], total: (rows || []).length });
    }

    // GET /api/media/soportes (lista para selector en alta/edición)
    if (segment === "soportes") {
      const rows = await executeQuery(QUERIES.GET_SOPORTES);
      return res
        .status(200)
        .json({ data: rows || [], total: (rows || []).length });
    }

    // Sin segmento o segmento desconocido: por defecto listar libros (compatibilidad con /api/media/books)
    if (!segment || segment === "") {
      const {
        search,
        searchBy = "titulo",
        letter,
        filterBy = "titulo",
        hastag: hastagParam,
        tipo: tipoParam,
      } = req.query;
      let query,
        params = [];
      const hastagTag =
        hastagParam != null && String(hastagParam).trim() !== ""
          ? "#" + String(hastagParam).trim().replace(/^#+/, "")
          : null;
      const tipoSlug = normalizarTipoSlug(tipoParam);
      const tipoId = tipoSlug ? await resolveTipoSlugToId(tipoSlug) : null;
      if (hastagTag) {
        if (tipoId != null) {
          query = QUERIES.GET_BOOKS_BY_HASTAG_BY_TIPO_ID;
          params = [tipoId, hastagTag];
        } else if (tipoSlug) {
          query = QUERIES.GET_BOOKS_BY_HASTAG_BY_TIPO;
          params = [tipoSlug, hastagTag];
        } else {
          query = QUERIES.GET_BOOKS_BY_HASTAG;
          params = [hastagTag];
        }
      } else if (search) {
        const searchPattern = `%${search}%`;
        const smartP = buildSmartObraLikeParams(search);
        if (tipoId != null) {
          query =
            searchBy === "autor"
              ? QUERIES.SEARCH_BOOKS_BY_AUTHOR_BY_TIPO_ID
              : QUERIES.SEARCH_BOOKS_SMART_OBRA_BY_TIPO_ID;
          params =
            searchBy === "autor"
              ? [tipoId, searchPattern]
              : [tipoId, ...smartP];
        } else if (tipoSlug) {
          query =
            searchBy === "autor"
              ? QUERIES.SEARCH_BOOKS_BY_AUTHOR_BY_TIPO
              : QUERIES.SEARCH_BOOKS_SMART_OBRA_BY_TIPO;
          params =
            searchBy === "autor"
              ? [tipoSlug, searchPattern]
              : [tipoSlug, ...smartP];
        } else {
          query =
            searchBy === "autor"
              ? QUERIES.SEARCH_BOOKS_BY_AUTHOR
              : QUERIES.SEARCH_BOOKS_SMART_OBRA;
          params = searchBy === "autor" ? [searchPattern] : smartP;
        }
      } else if (letter) {
        const letterPattern = `${letter}%`;
        if (tipoId != null) {
          query =
            filterBy === "autor"
              ? QUERIES.FILTER_BOOKS_BY_LETTER_AUTHOR_BY_TIPO_ID
              : QUERIES.FILTER_BOOKS_BY_LETTER_TITLE_BY_TIPO_ID;
          params = [tipoId, letterPattern];
        } else if (tipoSlug) {
          query =
            filterBy === "autor"
              ? QUERIES.FILTER_BOOKS_BY_LETTER_AUTHOR_BY_TIPO
              : QUERIES.FILTER_BOOKS_BY_LETTER_TITLE_BY_TIPO;
          params = [tipoSlug, letterPattern];
        } else {
          query =
            filterBy === "autor"
              ? QUERIES.FILTER_BOOKS_BY_LETTER_AUTHOR
              : QUERIES.FILTER_BOOKS_BY_LETTER_TITLE;
          params = [letterPattern];
        }
      } else {
        if (tipoId != null) {
          query = QUERIES.GET_ALL_BOOKS_BY_TIPO_ID;
          params = [tipoId];
        } else if (tipoSlug) {
          query = QUERIES.GET_ALL_BOOKS_BY_TIPO;
          params = [tipoSlug];
        } else {
          query = QUERIES.GET_ALL_BOOKS;
          params = [];
        }
      }
      const filterApplied = {
        sqlCondition: tipoSlug
          ? tipoId != null
            ? "WHERE tc.id = ? (JOIN core_soportes + core_tipos_coleccion)"
            : "WHERE tc.slug = ? (JOIN core_soportes + core_tipos_coleccion)"
          : "Sin filtro por tipo",
        tipoParam: tipoSlug,
        tipoId: tipoId ?? undefined,
        params,
      };
      let books = await executeQuery(query, params);
      if (
        tipoSlug &&
        tipoId == null &&
        books.length === 0 &&
        !hastagTag &&
        !search &&
        !letter
      ) {
        const slugAlt = slugSinAcentos(tipoSlug);
        if (slugAlt && slugAlt !== tipoSlug) {
          books = await executeQuery(QUERIES.GET_ALL_BOOKS_BY_TIPO, [slugAlt]);
        }
      }
      const booksWithCopies = await enrichBooksWithCopies(books);
      const sanitized = booksWithCopies.map(sanitizeBookListItem);
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, max-age=0",
      );
      res.setHeader("Pragma", "no-cache");
      return res.status(200).json({
        data: sanitized,
        total: sanitized.length,
        filters: {
          search: search || null,
          searchBy,
          letter: letter || null,
          filterBy,
          hastag: hastagTag || null,
          tipo: tipoSlug || null,
        },
        filterApplied,
      });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error in /api/media:", error);
    const message = error?.message || String(error);
    return res.status(500).json({
      error: "Error en el servidor",
      message: message,
    });
  }
}
