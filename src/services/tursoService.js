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
    cache: 'no-store',
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
 * Obtiene la URL de preview de un tema desde Deezer (vía proxy API para evitar CORS).
 * @param {string} q - Búsqueda (ej. "Artist Song title")
 * @returns {Promise<string|null>} URL del MP3 de preview (~30 s) o null
 */
export async function getDeezerPreview(q) {
  const query = (q || '').trim().slice(0, 200);
  if (!query) return null;
  try {
    const json = await apiGet('/api/external', { route: 'deezer-preview', q: query });
    return json?.preview ?? null;
  } catch {
    return null;
  }
}

/**
 * Resuelve el enlace directo de un tema en Deezer (artista + álbum + tema).
 * Útil cuando la lista viene de MusicBrainz y no hay enlace guardado.
 * @param {string} artist - Nombre del artista
 * @param {string} album - Título del disco
 * @param {string} track - Título del tema
 * @returns {Promise<string|null>} URL del tema en Deezer o null si no se encuentra
 */
export async function resolveDeezerTrackLink(artist, album, track) {
  const t = (track || '').trim();
  if (!t) return null;
  try {
    const json = await apiGet('/api/external', {
      route: 'deezer-resolve',
      artist: (artist || '').trim(),
      album: (album || '').trim(),
      track: t,
    });
    const link = json?.link;
    return link && (link.startsWith('http://') || link.startsWith('https://')) ? link : null;
  } catch {
    return null;
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
 * Obtiene todos los títulos (o filtrados por tipo de colección).
 * @param {string|null} tipoSlug - Slug del tipo (libros, audio, video) o null para todos
 */
export async function getAllBooks(tipoSlug = null) {
  const params = tipoSlug ? { tipo: tipoSlug } : {};
  const json = await apiGet('/api/media/books', params);
  return { data: json.data ?? [], filterApplied: json.filterApplied ?? null };
}

/**
 * Libros que contienen el hastag (palabra completa). tag puede ser "novela" o "#novela"
 * @param {string} tag
 * @param {string|null} tipoSlug - Slug del tipo de colección o null para todos
 */
export async function getBooksByHastag(tag, tipoSlug = null) {
  const t = tag != null ? String(tag).trim().replace(/^#+/, '') : '';
  if (!t) return { data: [], filterApplied: null };
  const params = { hastag: t };
  if (tipoSlug) params.tipo = tipoSlug;
  const json = await apiGet('/api/media/books', params);
  return { data: json.data ?? [], filterApplied: json.filterApplied ?? null };
}

/**
 * Busca libros por título o autor
 * @param {string|null} tipoSlug - Slug del tipo de colección o null para todos
 */
export async function searchBooks(searchTerm, searchBy = 'titulo', tipoSlug = null) {
  const params = { search: searchTerm, searchBy };
  if (tipoSlug) params.tipo = tipoSlug;
  const json = await apiGet('/api/media/books', params);
  return { data: json.data ?? [], filterApplied: json.filterApplied ?? null };
}

/**
 * Filtra libros por letra inicial
 * @param {string|null} tipoSlug - Slug del tipo de colección o null para todos
 */
export async function filterBooksByLetter(letter, filterBy = 'titulo', tipoSlug = null) {
  const params = { letter, filterBy };
  if (tipoSlug) params.tipo = tipoSlug;
  const json = await apiGet('/api/media/books', params);
  return { data: json.data ?? [], filterApplied: json.filterApplied ?? null };
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
 * Soportes para selector en alta/edición de título
 */
export async function getSoportes() {
  const json = await apiGet('/api/media/soportes');
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

// ==================== Discoteca: MusicBrainz + Cover Art Archive (sin API key) ====================

const MUSICBRAINZ_USER_AGENT = 'CatalogoDiscoteca/1.0 (https://github.com/catalogo)';
const MUSICBRAINZ_BASE = 'https://musicbrainz.org/ws/2';
const COVERART_BASE = 'https://coverartarchive.org';

function msToDuracion(ms) {
  if (ms == null || typeof ms !== 'number' || ms < 0) return null;
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Extrae el MBID de release (UUID) desde texto plano o URL de musicbrainz.org/release/...
 */
export function parseMusicBrainzReleaseMbidFromInput(str) {
  const s = (str == null ? '' : String(str)).trim();
  if (!s) return null;
  const m = s.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
  return m ? m[0].toLowerCase() : null;
}

/** Extrae el nombre del artista desde artist-credit (puede ser uno o varios; join phrases). */
function artistCreditToName(artistCredit) {
  if (!Array.isArray(artistCredit) || artistCredit.length === 0) return null;
  const parts = artistCredit
    .map((c) => {
      if (!c) return '';
      const n = c.name ?? c.artist?.name ?? '';
      return typeof n === 'string' ? n.trim() : '';
    })
    .filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

/**
 * Busca un release (disco) en MusicBrainz por código de barras EAN.
 * Respuesta: { releaseId, title, artist, date, barcode } o null.
 * Límite: 1 petición por segundo (MusicBrainz).
 */
export async function fetchMusicBrainzReleaseByBarcode(ean) {
  const clean = String(ean).replace(/\D/g, '').trim();
  if (!clean) return null;
  const url = `${MUSICBRAINZ_BASE}/release?query=barcode:${encodeURIComponent(clean)}&fmt=json&limit=5`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT },
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  if (!data?.releases?.length) return null;
  const r = data.releases[0];
  const artist = artistCreditToName(r['artist-credit']) ?? r['artist-credit']?.[0]?.name ?? r['artist-credit']?.[0]?.artist?.name ?? null;
  let year = null;
  if (r.date) {
    const match = r.date.match(/\d{4}/);
    if (match) year = parseInt(match[0], 10);
  }
  return {
    releaseId: r.id,
    title: r.title ?? null,
    artist,
    date: r.date ?? null,
    year,
    barcode: r.barcode ?? null,
  };
}

/**
 * Obtiene metadatos básicos de un release por su MBID (UUID).
 * Misma forma que fetchMusicBrainzReleaseByBarcode.
 */
export async function fetchMusicBrainzReleaseByMbid(mbid) {
  const id = parseMusicBrainzReleaseMbidFromInput(mbid);
  if (!id) return null;
  const url = `${MUSICBRAINZ_BASE}/release/${encodeURIComponent(id)}?inc=labels&fmt=json`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT },
  });
  if (!response.ok) return null;
  const r = await response.json().catch(() => null);
  if (!r || !r.id) return null;
  const artist = artistCreditToName(r['artist-credit']) ?? r['artist-credit']?.[0]?.name ?? r['artist-credit']?.[0]?.artist?.name ?? null;
  let year = null;
  if (r.date) {
    const match = r.date.match(/\d{4}/);
    if (match) year = parseInt(match[0], 10);
  }
  return {
    releaseId: r.id,
    title: r.title ?? null,
    artist,
    date: r.date ?? null,
    year,
    barcode: r.barcode ?? null,
  };
}

/**
 * Busca un release por número de catálogo del sello y/o nombre del sello (p. ej. Deutsche Grammophon).
 * Misma forma que fetchMusicBrainzReleaseByBarcode.
 */
export async function fetchMusicBrainzReleaseByCatalog(catno, label) {
  const c = (catno || '').trim();
  const l = (label || '').trim();
  if (!c && !l) return null;
  const parts = [];
  if (c) parts.push(`catno:${c}`);
  if (l) parts.push(`label:${l}`);
  const query = parts.join(' AND ');
  const url = `${MUSICBRAINZ_BASE}/release?query=${encodeURIComponent(query)}&fmt=json&limit=5`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT },
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  if (!data?.releases?.length) return null;
  const r = data.releases[0];
  const artistName = artistCreditToName(r['artist-credit']) ?? r['artist-credit']?.[0]?.name ?? r['artist-credit']?.[0]?.artist?.name ?? null;
  let year = null;
  if (r.date) {
    const match = r.date.match(/\d{4}/);
    if (match) year = parseInt(match[0], 10);
  }
  return {
    releaseId: r.id,
    title: r.title ?? null,
    artist: artistName,
    date: r.date ?? null,
    year,
    barcode: r.barcode ?? null,
  };
}

/**
 * Busca un release por artista y título (cuando no hay EAN).
 * Respuesta: misma forma que fetchMusicBrainzReleaseByBarcode.
 */
export async function fetchMusicBrainzReleaseByQuery(artist, releaseTitle) {
  const parts = [];
  if (artist && String(artist).trim()) parts.push(`artist:${encodeURIComponent(String(artist).trim())}`);
  if (releaseTitle && String(releaseTitle).trim()) parts.push(`release:${encodeURIComponent(String(releaseTitle).trim())}`);
  if (parts.length === 0) return null;
  const query = parts.join('+');
  const url = `${MUSICBRAINZ_BASE}/release?query=${query}&fmt=json&limit=5`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT },
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  if (!data?.releases?.length) return null;
  const r = data.releases[0];
  const artistName = artistCreditToName(r['artist-credit']) ?? r['artist-credit']?.[0]?.name ?? r['artist-credit']?.[0]?.artist?.name ?? null;
  let year = null;
  if (r.date) {
    const match = r.date.match(/\d{4}/);
    if (match) year = parseInt(match[0], 10);
  }
  return {
    releaseId: r.id,
    title: r.title ?? null,
    artist: artistName,
    date: r.date ?? null,
    year,
    barcode: r.barcode ?? null,
  };
}

/**
 * Obtiene el detalle de un release con la lista de temas (recordings).
 * Respuesta: { title, artist, date, year, temas: [{ numero, titulo, duracion }] }.
 */
export async function fetchMusicBrainzReleaseWithTracks(releaseId) {
  if (!releaseId) return null;
  const url = `${MUSICBRAINZ_BASE}/release/${encodeURIComponent(releaseId)}?inc=recordings+labels&fmt=json`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT },
  });
  if (!response.ok) return null;
  const r = await response.json().catch(() => null);
  if (!r || !r.id) return null;
  const artist = artistCreditToName(r['artist-credit']) ?? r['artist-credit']?.[0]?.name ?? r['artist-credit']?.[0]?.artist?.name ?? null;
  let year = null;
  if (r.date) {
    const match = r.date.match(/\d{4}/);
    if (match) year = parseInt(match[0], 10);
  }
  const labelInfo = r['label-info'];
  const editorial = (Array.isArray(labelInfo) && labelInfo[0]?.label?.name) ? labelInfo[0].label.name : null;
  const temas = [];
  const media = r.media ?? [];
  for (const medium of media) {
    const tracks = medium.tracks ?? [];
    for (const t of tracks) {
      const pos = t.position ?? temas.length + 1;
      const titulo = t.title ?? t.recording?.title ?? '';
      const lengthMs = t.length ?? t.recording?.length;
      temas.push({
        numero: pos,
        titulo,
        duracion: msToDuracion(lengthMs),
      });
    }
  }
  return {
    title: r.title ?? null,
    artist,
    date: r.date ?? null,
    year,
    editorial: editorial ?? null,
    temas,
  };
}

/**
 * Portada de un release desde Cover Art Archive (sin API key).
 * Devuelve la URL de la imagen frontal o null.
 */
export async function fetchCoverArtArchiveRelease(mbid) {
  if (!mbid) return null;
  const response = await fetch(`${COVERART_BASE}/release/${mbid}`, {
    method: 'GET',
    headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT },
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  if (!data?.images?.length) return null;
  const front = data.images.find((i) => i.front === true) ?? data.images[0];
  return front?.image ?? null;
}

/**
 * Busca datos de un disco (álbum) por EAN: título, autor, año y listado de temas.
 * Usa MusicBrainz (búsqueda por barcode + lookup con recordings) y Cover Art Archive para portada.
 * Respuesta: { titulo, autor, anyoEdicion, portadaUrl?, temas: [{ numero, titulo, duracion }] } o null.
 * MusicBrainz limita a 1 petición/segundo; se hace search + delay + lookup + opcional cover.
 */
export async function fetchAlbumMetadataByEan(ean) {
  const data = await apiGet('/api/lookup-disc', { ean });
  if (!data) return null;
  return {
    titulo: data.titulo ?? null,
    autor: data.autor ?? null,
    anyoEdicion: data.anyoEdicion ?? null,
    editorial: data.editorial ?? null,
    portadaUrl: data.portadaUrl ?? null,
    temas: Array.isArray(data.temas) ? data.temas : [],
    musicbrainzReleaseMbid: data.musicbrainzReleaseMbid ?? null,
    hastag: data.hastag ?? null,
  };
}

/**
 * Busca datos de un disco por MBID de release (UUID o URL de musicbrainz.org/release/...).
 * Misma forma de respuesta que fetchAlbumMetadataByEan.
 */
export async function fetchAlbumMetadataByReleaseMbid(mbidOrUrl) {
  const data = await apiGet('/api/lookup-disc', { mbid: mbidOrUrl });
  if (!data) return null;
  return {
    titulo: data.titulo ?? null,
    autor: data.autor ?? null,
    anyoEdicion: data.anyoEdicion ?? null,
    editorial: data.editorial ?? null,
    portadaUrl: data.portadaUrl ?? null,
    temas: Array.isArray(data.temas) ? data.temas : [],
    musicbrainzReleaseMbid: data.musicbrainzReleaseMbid ?? null,
    hastag: data.hastag ?? null,
  };
}

/**
 * Busca datos de un disco por catálogo de sello + nombre de sello (sin código de barras).
 * Misma forma de respuesta que fetchAlbumMetadataByEan.
 */
export async function fetchAlbumMetadataByCatalog(catno, label) {
  const data = await apiGet('/api/lookup-disc', { catalog: catno, label });
  if (!data) return null;
  return {
    titulo: data.titulo ?? null,
    autor: data.autor ?? null,
    anyoEdicion: data.anyoEdicion ?? null,
    editorial: data.editorial ?? null,
    portadaUrl: data.portadaUrl ?? null,
    temas: Array.isArray(data.temas) ? data.temas : [],
    musicbrainzReleaseMbid: data.musicbrainzReleaseMbid ?? null,
    hastag: data.hastag ?? null,
  };
}

/**
 * Busca datos de un disco por artista y título (sin EAN).
 * Misma forma de respuesta que fetchAlbumMetadataByEan.
 */
export async function fetchAlbumMetadataByQuery(artist, releaseTitle) {
  const data = await apiGet('/api/lookup-disc', { artist, release: releaseTitle });
  if (!data) return null;
  return {
    titulo: data.titulo ?? null,
    autor: data.autor ?? null,
    anyoEdicion: data.anyoEdicion ?? null,
    editorial: data.editorial ?? null,
    portadaUrl: data.portadaUrl ?? null,
    temas: Array.isArray(data.temas) ? data.temas : [],
    musicbrainzReleaseMbid: data.musicbrainzReleaseMbid ?? null,
    hastag: data.hastag ?? null,
  };
}
