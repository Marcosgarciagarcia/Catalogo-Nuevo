/**
 * Servicio para obtener datos del catálogo desde la API (backend).
 * No se conecta a Turso desde el navegador; todas las peticiones pasan por /api.
 * No se usa ningún token de base de datos en el frontend.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function toErrorMessage(j, fallback) {
  if (!j || typeof j === 'string') return j || fallback;
  // Mostrar message (detalle técnico) si existe; si no, error (resumen)
  const msg = j.message ?? j.error;
  if (typeof msg === 'string') return msg;
  if (msg && typeof msg.message === 'string') return msg.message;
  return fallback;
}

function apiError(response, fallbackMessage) {
  if (response.status === 404) {
    return Promise.resolve(new Error('API no disponible. En local ejecuta: npx vercel dev'));
  }
  const ct = response.headers.get('content-type');
  if (ct && ct.includes('application/json')) {
    return response.json().then((j) => new Error(toErrorMessage(j, fallbackMessage))).catch(() => new Error(fallbackMessage));
  }
  return Promise.resolve(new Error(fallbackMessage));
}

async function apiGet(path, params = {}) {
  const search = new URLSearchParams(params).toString();
  const url = `${API_BASE}${path}${search ? `?${search}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw await apiError(response, `Error ${response.status} al cargar datos`);
  }
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('API no disponible. En local ejecuta: npx vercel dev');
  }
  try {
    return await response.json();
  } catch {
    throw new Error('API no devolvió JSON válido. En local ejecuta: npx vercel dev');
  }
}

/**
 * Tipos de colección para el selector inicial (menú dinámico).
 */
export async function getCollectionTypes() {
  const json = await apiGet('/api/catalog-types');
  return json.data ?? [];
}

/**
 * Sincroniza pendientes de la base local a Turso (altas/actualizaciones).
 * La API solo hace algo si LOCAL_DATABASE_URL está configurado (misma SQLite que catalogo_manager).
 * Llamar al arrancar la webapp (p. ej. al entrar en el catálogo) para que Turso tenga lo último.
 */
export async function syncFromLocal() {
  try {
    const json = await apiGet('/api/sync-from-local');
    return { synced: !!json.synced, pushed: json.pushed ?? 0 };
  } catch {
    return { synced: false, pushed: 0 };
  }
}

/**
 * Obtiene todos los libros con información de autor y editorial
 */
export async function getAllBooks() {
  const json = await apiGet('/api/media/books');
  return json.data ?? [];
}

/**
 * Libros que contienen el hastag (palabra completa). tag puede ser "novela" o "#novela"
 */
export async function getBooksByHastag(tag) {
  const t = tag != null ? String(tag).trim().replace(/^#+/, '') : '';
  if (!t) return [];
  const json = await apiGet('/api/media/books', { hastag: t });
  return json.data ?? [];
}

/**
 * Busca libros por título o autor
 */
export async function searchBooks(searchTerm, searchBy = 'titulo') {
  const json = await apiGet('/api/media/books', {
    search: searchTerm,
    searchBy,
  });
  return json.data ?? [];
}

/**
 * Filtra libros por letra inicial
 */
export async function filterBooksByLetter(letter, filterBy = 'titulo') {
  const json = await apiGet('/api/media/books', {
    letter,
    filterBy,
  });
  return json.data ?? [];
}

/**
 * Obtiene estadísticas del catálogo
 */
export async function getStats() {
  return apiGet('/api/media/stats');
}

/**
 * Obtiene un libro por ID
 */
export async function getBookById(id) {
  const res = await fetch(`${API_BASE}/api/media/books/${id}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw await apiError(res, `Error ${res.status}`);
  }
  const ct = res.headers.get('content-type');
  if (!ct || !ct.includes('application/json')) {
    throw new Error('API no disponible. En local ejecuta: npx vercel dev');
  }
  return res.json();
}

/**
 * Lista de ubicaciones (para selector en edición de libro)
 */
export async function getUbicaciones() {
  const json = await apiGet('/api/media/ubicaciones');
  return json.data ?? [];
}

/**
 * Lista de estantes (para selector en edición de libro)
 */
export async function getEstantes() {
  const json = await apiGet('/api/media/estantes');
  return json.data ?? [];
}

/**
 * Lista de autores (para combos en altas)
 */
export async function getAuthors(search = '') {
  const params = search ? { search } : {};
  const json = await apiGet('/api/media/authors', params);
  return json.data ?? [];
}

/**
 * Lista de editoriales (para combos en altas)
 */
export async function getPublishers(search = '') {
  const params = search ? { search } : {};
  const json = await apiGet('/api/media/publishers', params);
  return json.data ?? [];
}

async function apiPost(path, body, token) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) {
    throw await apiError(response, `Error ${response.status} al enviar datos`);
  }
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('La API no devolvió JSON');
  }
  return response.json();
}

/**
 * Crea un autor. Requiere token de staff.
 */
export async function createAuthor(body, token) {
  return apiPost('/api/media/authors', body, token);
}

/**
 * Crea una editorial. Requiere token de staff.
 */
export async function createPublisher(body, token) {
  return apiPost('/api/media/publishers', body, token);
}

/**
 * Crea un libro. Requiere token de staff.
 * body: EAN, titulo, tituloOriginal, anyoEdicion, numeroPaginas, portada_cloudinary,
 *       sinopsis, observaciones, coleccion, serie, codiAutor_id, codiEditorial_id
 *       o en su lugar authorName/addNewAuthor, publisherName/addNewPublisher.
 */
export async function createBook(body, token) {
  return apiPost('/api/media/books', body, token);
}

/**
 * Actualiza un libro por id. Requiere token de staff.
 * Los cambios se guardan en Turso; la app de escritorio los recibe al sincronizar.
 * body: mismos campos que createBook.
 */
export async function updateBook(id, body, token) {
  const url = `${API_BASE}/api/media/books/${id}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!response.ok) {
    throw await apiError(response, `Error ${response.status} al actualizar el libro`);
  }
  const ct = response.headers.get('content-type');
  if (!ct || !ct.includes('application/json')) throw new Error('La API no devolvió JSON');
  return response.json();
}

/**
 * Elimina un libro por id. Requiere token de staff.
 */
export async function deleteBook(id, token) {
  const url = `${API_BASE}/api/media/books/${id}`;
  const headers = {
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { method: 'DELETE', headers });
  if (response.status === 204) return true;
  if (!response.ok) {
    throw await apiError(response, `Error ${response.status} al eliminar el libro`);
  }
  return true;
}

const OPEN_LIBRARY_BOOKS = 'https://openlibrary.org/api/books';

/**
 * Busca datos de un libro por ISBN en Open Library (desde el navegador, sin API key).
 * @param {string} isbn - ISBN sin guiones
 * @returns {Promise<{ titulo?: string, tituloOriginal?: string, autores?: string[], editorial?: string, anyoEdicion?: number, portadaUrl?: string, sinopsis?: string } | null>}
 */
export async function fetchOpenLibraryByIsbn(isbn) {
  const clean = String(isbn).replace(/-/g, '').trim();
  if (!clean) return null;
  const url = `${OPEN_LIBRARY_BOOKS}?bibkeys=ISBN:${encodeURIComponent(clean)}&format=json&jscmd=data`;
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== 'object') return null;
  const key = `ISBN:${clean}`;
  const book = data[key];
  if (!book || typeof book !== 'object') return null;
  const titulo = book.title ?? '';
  const tituloOriginal = book.title ?? null;
  let authors = Array.isArray(book.authors) ? book.authors.map((a) => (a && (a.name != null ? a.name : a)) || '').filter(Boolean) : [];
  if (authors.length === 0 && book.by_statement && typeof book.by_statement === 'string') {
    authors = book.by_statement.split(/\s+and\s+|,\s*|\s*;\s*/i).map((s) => s.replace(/^\s*by\s*\.?\s*/i, '').trim()).filter(Boolean);
  }
  const primerAutor = authors[0] ?? '';
  const restoAutores = authors.length > 1 ? authors.slice(1) : [];
  const observacionesDeAutores = restoAutores.length > 0 ? `Otros autores: ${restoAutores.join(', ')}` : null;
  const observaciones = observacionesDeAutores ?? (book.notes?.value ?? null) ?? null;
  const covers = book.cover;
  let portadaUrl = null;
  if (covers && typeof covers === 'object' && covers.large) portadaUrl = covers.large;
  else if (covers && typeof covers === 'object' && covers.medium) portadaUrl = covers.medium;
  else if (covers && typeof covers === 'object' && covers.small) portadaUrl = covers.small;
  const publishers = Array.isArray(book.publishers) ? book.publishers.map((p) => p.name || '').filter(Boolean) : [];
  const editorial = publishers[0] ?? '';
  const publishDate = book.publish_date?.trim();
  let anyoEdicion = null;
  if (publishDate) {
    const match = publishDate.match(/\d{4}/);
    if (match) anyoEdicion = parseInt(match[0], 10);
  }
  const sinopsis = book.notes?.value ?? null;
  return {
    titulo: titulo || null,
    tituloOriginal: tituloOriginal || null,
    autor: primerAutor || null,
    observaciones: observaciones || null,
    editorial: editorial || null,
    anyoEdicion,
    portadaUrl: portadaUrl || null,
    sinopsis: sinopsis || null,
  };
}

const GOOGLE_BOOKS_VOLUMES = 'https://www.googleapis.com/books/v1/volumes';

/**
 * Busca datos de un libro por ISBN en Google Books (sin API key; cuota limitada).
 * Devuelve el mismo formato que fetchOpenLibraryByIsbn para poder usarlo como fallback.
 */
export async function fetchGoogleBooksByIsbn(isbn) {
  const clean = String(isbn).replace(/-/g, '').trim();
  if (!clean) return null;
  const url = `${GOOGLE_BOOKS_VOLUMES}?q=isbn:${encodeURIComponent(clean)}`;
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  if (!data?.items?.length) return null;
  const vol = data.items[0];
  const info = vol?.volumeInfo;
  if (!info || typeof info !== 'object') return null;
  const titulo = info.title ?? null;
  const authors = Array.isArray(info.authors) ? info.authors : [];
  const primerAutor = authors[0] ?? null;
  const restoAutores = authors.length > 1 ? authors.slice(1) : [];
  const observaciones = restoAutores.length > 0 ? `Otros autores: ${restoAutores.join(', ')}` : null;
  const editorial = info.publisher ?? null;
  let anyoEdicion = null;
  const pubDate = info.publishedDate?.trim();
  if (pubDate) {
    const match = pubDate.match(/\d{4}/);
    if (match) anyoEdicion = parseInt(match[0], 10);
  }
  const sinopsis = info.description ?? null;
  let portadaUrl = null;
  const links = info.imageLinks;
  if (links && typeof links === 'object') {
    const raw = links.extraLarge || links.large || links.medium || links.small || links.thumbnail || null;
    if (raw && typeof raw === 'string') portadaUrl = raw.replace(/^http:\/\//i, 'https://');
  }
  return {
    titulo: titulo || null,
    tituloOriginal: titulo || null,
    autor: primerAutor || null,
    observaciones: observaciones || null,
    editorial: editorial || null,
    anyoEdicion,
    portadaUrl: portadaUrl || null,
    sinopsis: sinopsis || null,
  };
}

/**
 * Busca datos del libro por ISBN: Open Library y, si no hay resultado, Google Books.
 * (Opcional para documentación futura: WorldCat Search API v2 como tercer fallback con VITE_WORLDCAT_WSKEY.)
 */
export async function fetchBookMetadataByIsbn(isbn) {
  const fromOpenLibrary = await fetchOpenLibraryByIsbn(isbn);
  if (fromOpenLibrary != null) return fromOpenLibrary;
  return fetchGoogleBooksByIsbn(isbn);
}
