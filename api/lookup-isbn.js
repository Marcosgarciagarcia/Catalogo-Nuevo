/**
 * GET /api/lookup-isbn?isbn=xxx
 * Busca datos de un libro por ISBN (Open Library + Google Books).
 * Para uso desde la app de escritorio y cualquier cliente que no pueda llamar a las APIs externas directamente.
 * No requiere autenticación (datos públicos).
 */

const OPEN_LIBRARY_BOOKS = 'https://openlibrary.org/api/books';
const GOOGLE_BOOKS_VOLUMES = 'https://www.googleapis.com/books/v1/volumes';

async function fetchOpenLibrary(isbn) {
  const clean = String(isbn).replace(/-/g, '').trim();
  if (!clean) return null;
  const url = `${OPEN_LIBRARY_BOOKS}?bibkeys=ISBN:${encodeURIComponent(clean)}&format=json&jscmd=data`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data || typeof data !== 'object') return null;
  const key = `ISBN:${clean}`;
  const book = data[key];
  if (!book || typeof book !== 'object') return null;
  let authors = Array.isArray(book.authors) ? book.authors.map((a) => (a && (a.name != null ? a.name : a)) || '').filter(Boolean) : [];
  if (authors.length === 0 && book.by_statement && typeof book.by_statement === 'string') {
    authors = book.by_statement.split(/\s+and\s+|,\s*|\s*;\s*/i).map((s) => s.replace(/^\s*by\s*\.?\s*/i, '').trim()).filter(Boolean);
  }
  const primerAutor = authors[0] ?? '';
  const restoAutores = authors.length > 1 ? authors.slice(1) : [];
  const observacionesDeAutores = restoAutores.length > 0 ? `Otros autores: ${restoAutores.join(', ')}` : null;
  const observaciones = observacionesDeAutores ?? (book.notes?.value ?? null) ?? null;
  let portadaUrl = null;
  const covers = book.cover;
  if (covers && typeof covers === 'object') {
    portadaUrl = covers.large || covers.medium || covers.small || null;
  }
  const publishers = Array.isArray(book.publishers) ? book.publishers.map((p) => p.name || '').filter(Boolean) : [];
  const editorial = publishers[0] ?? '';
  let anyoEdicion = null;
  const publishDate = book.publish_date?.trim();
  if (publishDate) {
    const m = publishDate.match(/\d{4}/);
    if (m) anyoEdicion = parseInt(m[0], 10);
  }
  return {
    titulo: book.title ?? null,
    tituloOriginal: book.title ?? null,
    autor: primerAutor || null,
    observaciones: observaciones || null,
    editorial: editorial || null,
    anyoEdicion,
    portadaUrl: portadaUrl || null,
    sinopsis: book.notes?.value ?? null,
  };
}

async function fetchGoogleBooks(isbn) {
  const clean = String(isbn).replace(/-/g, '').trim();
  if (!clean) return null;
  const url = `${GOOGLE_BOOKS_VOLUMES}?q=isbn:${encodeURIComponent(clean)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data?.items?.length) return null;
  const info = data.items[0]?.volumeInfo;
  if (!info || typeof info !== 'object') return null;
  const authors = Array.isArray(info.authors) ? info.authors : [];
  const primerAutor = authors[0] ?? null;
  const restoAutores = authors.length > 1 ? authors.slice(1) : [];
  const observaciones = restoAutores.length > 0 ? `Otros autores: ${restoAutores.join(', ')}` : null;
  let anyoEdicion = null;
  const pubDate = info.publishedDate?.trim();
  if (pubDate) {
    const m = pubDate.match(/\d{4}/);
    if (m) anyoEdicion = parseInt(m[0], 10);
  }
  let portadaUrl = null;
  const links = info.imageLinks;
  if (links && typeof links === 'object') {
    const raw = links.extraLarge || links.large || links.medium || links.small || links.thumbnail || null;
    if (raw && typeof raw === 'string') portadaUrl = raw.replace(/^http:\/\//i, 'https://');
  }
  return {
    titulo: info.title ?? null,
    tituloOriginal: info.title ?? null,
    autor: primerAutor || null,
    observaciones: observaciones || null,
    editorial: info.publisher ?? null,
    anyoEdicion,
    portadaUrl: portadaUrl || null,
    sinopsis: info.description ?? null,
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const isbn = (req.query.isbn || '').replace(/\D/g, '').trim();
  if (!isbn) {
    return res.status(400).json({ error: 'Parámetro isbn es obligatorio' });
  }
  try {
    let data = await fetchOpenLibrary(isbn);
    if (data == null) data = await fetchGoogleBooks(isbn);
    if (data == null) {
      return res.status(200).json(null);
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (err) {
    console.error('lookup-isbn:', err);
    return res.status(500).json({ error: err?.message || 'Error al buscar por ISBN' });
  }
}
