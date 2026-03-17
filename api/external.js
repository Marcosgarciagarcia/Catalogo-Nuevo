/**
 * Un solo endpoint para lookup-isbn, lookup-disc y upload-cover (límite 12 funciones Hobby).
 * Rewrites: /api/lookup-isbn -> /api/external?route=lookup-isbn, etc.
 */

// ---------- lookup-isbn (Open Library + Google Books) ----------
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
  const observaciones = restoAutores.length > 0 ? `Otros autores: ${restoAutores.join(', ')}` : (book.notes?.value ?? null) ?? null;
  let portadaUrl = null;
  const covers = book.cover;
  if (covers && typeof covers === 'object') portadaUrl = covers.large || covers.medium || covers.small || null;
  const publishers = Array.isArray(book.publishers) ? book.publishers.map((p) => p.name || '').filter(Boolean) : [];
  const editorial = publishers[0] ?? '';
  let anyoEdicion = null;
  const publishDate = book.publish_date?.trim();
  if (publishDate) { const m = publishDate.match(/\d{4}/); if (m) anyoEdicion = parseInt(m[0], 10); }
  return {
    titulo: book.title ?? null,
    tituloOriginal: book.title ?? null,
    autor: primerAutor || null,
    observaciones,
    editorial: editorial || null,
    anyoEdicion,
    portadaUrl: portadaUrl || null,
    sinopsis: book.notes?.value ?? null,
  };
}

async function fetchGoogleBooks(isbn) {
  const clean = String(isbn).replace(/-/g, '').trim();
  if (!clean) return null;
  const res = await fetch(`${GOOGLE_BOOKS_VOLUMES}?q=isbn:${encodeURIComponent(clean)}`, { method: 'GET' });
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
  if (pubDate) { const m = pubDate.match(/\d{4}/); if (m) anyoEdicion = parseInt(m[0], 10); }
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
    observaciones,
    editorial: info.publisher ?? null,
    anyoEdicion,
    portadaUrl: portadaUrl || null,
    sinopsis: info.description ?? null,
  };
}

async function handleLookupIsbn(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const isbn = (req.query.isbn || '').replace(/\D/g, '').trim();
  if (!isbn) return res.status(400).json({ error: 'Parámetro isbn es obligatorio' });
  try {
    let data = await fetchOpenLibrary(isbn);
    if (data == null) data = await fetchGoogleBooks(isbn);
    if (data == null) return res.status(200).json(null);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (err) {
    console.error('lookup-isbn:', err);
    return res.status(500).json({ error: err?.message || 'Error al buscar por ISBN' });
  }
}

// ---------- lookup-disc (MusicBrainz + Cover Art) ----------
const MUSICBRAINZ_UA = 'CatalogoDiscoteca/1.0 (https://github.com/catalogo)';
const MUSICBRAINZ_BASE = 'https://musicbrainz.org/ws/2';
const COVERART_BASE = 'https://coverartarchive.org';

function msToDuracion(ms) {
  if (ms == null || typeof ms !== 'number' || ms < 0) return null;
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

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

async function fetchMBReleaseByBarcode(ean) {
  try {
    const clean = String(ean).replace(/\D/g, '').trim();
    if (!clean) return null;
    const res = await fetch(`${MUSICBRAINZ_BASE}/release?query=barcode:${encodeURIComponent(clean)}&fmt=json&limit=5`, { headers: { 'User-Agent': MUSICBRAINZ_UA } });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data?.releases?.length) return null;
    const r = data.releases[0];
    const artist = artistCreditToName(r['artist-credit']) ?? r['artist-credit']?.[0]?.name ?? r['artist-credit']?.[0]?.artist?.name ?? null;
    let year = null;
    if (r.date) { const match = r.date.match(/\d{4}/); if (match) year = parseInt(match[0], 10); }
    return { releaseId: r.id, title: r.title ?? null, artist, date: r.date ?? null, year, barcode: r.barcode ?? null };
  } catch (_) {
    return null;
  }
}

async function fetchMBReleaseByQuery(artist, releaseTitle) {
  try {
    const parts = [];
    if (artist && String(artist).trim()) parts.push(`artist:${encodeURIComponent(String(artist).trim())}`);
    if (releaseTitle && String(releaseTitle).trim()) parts.push(`release:${encodeURIComponent(String(releaseTitle).trim())}`);
    if (parts.length === 0) return null;
    const res = await fetch(`${MUSICBRAINZ_BASE}/release?query=${parts.join('+')}&fmt=json&limit=5`, { headers: { 'User-Agent': MUSICBRAINZ_UA } });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data?.releases?.length) return null;
    const r = data.releases[0];
    const artistName = artistCreditToName(r['artist-credit']) ?? r['artist-credit']?.[0]?.name ?? r['artist-credit']?.[0]?.artist?.name ?? null;
    let year = null;
    if (r.date) { const match = r.date.match(/\d{4}/); if (match) year = parseInt(match[0], 10); }
    return { releaseId: r.id, title: r.title ?? null, artist: artistName, date: r.date ?? null, year, barcode: r.barcode ?? null };
  } catch (_) {
    return null;
  }
}

async function fetchMBReleaseWithTracks(releaseId) {
  try {
    if (!releaseId) return null;
    const res = await fetch(`${MUSICBRAINZ_BASE}/release/${encodeURIComponent(releaseId)}?inc=recordings+labels&fmt=json`, { headers: { 'User-Agent': MUSICBRAINZ_UA } });
    if (!res.ok) return null;
    const r = await res.json().catch(() => null);
    if (!r || !r.id) return null;
    const artist = artistCreditToName(r['artist-credit']) ?? r['artist-credit']?.[0]?.name ?? r['artist-credit']?.[0]?.artist?.name ?? null;
    let year = null;
    if (r.date) { const match = r.date.match(/\d{4}/); if (match) year = parseInt(match[0], 10); }
    let editorial = null;
    try {
      const labelInfo = r['label-info'];
      if (Array.isArray(labelInfo) && labelInfo[0]?.label?.name) editorial = labelInfo[0].label.name;
    } catch (_) {}
    const temas = [];
    for (const medium of r.media ?? []) {
      for (const t of medium.tracks ?? []) {
        const pos = t.position ?? temas.length + 1;
        temas.push({ numero: pos, titulo: t.title ?? t.recording?.title ?? '', duracion: msToDuracion(t.length ?? t.recording?.length) });
      }
    }
    return { title: r.title ?? null, artist, date: r.date ?? null, year, editorial, temas };
  } catch (_) {
    return null;
  }
}

async function fetchCoverArt(mbid) {
  try {
    if (!mbid) return null;
    const res = await fetch(`${COVERART_BASE}/release/${mbid}`, { headers: { 'User-Agent': MUSICBRAINZ_UA } });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data?.images?.length) return null;
    const front = data.images.find((i) => i.front === true) ?? data.images[0];
    return front?.image ?? null;
  } catch (_) {
    return null;
  }
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
}

async function handleLookupDisc(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ean = (req.query.ean || '').replace(/\D/g, '').trim();
    const artist = (req.query.artist || '').trim();
    const release = (req.query.release || req.query.title || '').trim();
    let first = null;
    if (ean) first = await fetchMBReleaseByBarcode(ean);
    else if (artist || release) first = await fetchMBReleaseByQuery(artist, release);
    if (!first) {
      setCors(res);
      return res.status(200).json(null);
    }
    await new Promise((r) => setTimeout(r, 1200));
    const detail = await fetchMBReleaseWithTracks(first.releaseId);
    if (!detail) {
      setCors(res);
      return res.status(200).json({ titulo: first.title, autor: first.artist, anyoEdicion: first.year, editorial: null, portadaUrl: null, temas: [] });
    }
    let portadaUrl = null;
    try {
      await new Promise((r) => setTimeout(r, 1200));
      portadaUrl = await fetchCoverArt(first.releaseId);
    } catch (_) {}
    setCors(res);
    return res.status(200).json({
      titulo: detail.title ?? first.title,
      autor: detail.artist ?? first.artist,
      anyoEdicion: detail.year ?? first.year,
      editorial: detail.editorial ?? null,
      portadaUrl: portadaUrl ?? null,
      temas: detail.temas ?? [],
    });
  } catch (err) {
    console.error('lookup-disc:', err);
    setCors(res);
    return res.status(200).json(null);
  }
}

// (fetchMBReleaseWithTracks está definida más arriba; esta duplicada se elimina para evitar sobrescritura)

// ---------- upload-cover (Cloudinary) ----------
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function handleUploadCover(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!CLOUD_NAME || !UPLOAD_PRESET) return res.status(503).json({ error: 'Cloudinary no configurado' });
  let fileValue;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    if (body.url && typeof body.url === 'string' && (body.url.startsWith('http://') || body.url.startsWith('https://'))) fileValue = body.url;
    else if (body.dataUrl && typeof body.dataUrl === 'string') {
      if (!body.dataUrl.startsWith('data:image/')) return res.status(400).json({ error: 'El contenido debe ser una imagen' });
      fileValue = body.dataUrl;
    } else if (body.imageBase64 && typeof body.imageBase64 === 'string') {
      const mime = body.mimeType || 'image/jpeg';
      fileValue = `data:${mime};base64,${body.imageBase64}`;
      if (!fileValue.startsWith('data:image/')) return res.status(400).json({ error: 'El contenido debe ser una imagen' });
    } else return res.status(400).json({ error: 'Body debe incluir url, dataUrl o imageBase64' });
  } catch (e) {
    return res.status(400).json({ error: 'Body JSON inválido' });
  }
  const formData = new FormData();
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('file', fileValue);
  try {
    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => ({}));
      return res.status(502).json({ error: errData?.error?.message || `Cloudinary: ${uploadRes.status}` });
    }
    const result = await uploadRes.json();
    const url = result.secure_url;
    if (!url) return res.status(502).json({ error: 'Cloudinary no devolvió URL' });
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ url });
  } catch (err) {
    console.error('upload-cover:', err);
    return res.status(500).json({ error: err?.message || 'Error al subir la imagen' });
  }
}

// ---------- deezer-preview (proxy para evitar CORS en el navegador) ----------
const DEEZER_SEARCH = 'https://api.deezer.com/search';

async function handleDeezerPreview(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const q = (req.query.q || '').trim().slice(0, 200);
  if (!q) return res.status(400).json({ error: 'Parámetro q es obligatorio' });
  try {
    const url = `${DEEZER_SEARCH}?q=${encodeURIComponent(q)}&limit=1`;
    const deezerRes = await fetch(url, { method: 'GET' });
    if (!deezerRes.ok) {
      return res.status(502).json({ error: 'Deezer no disponible', preview: null });
    }
    const data = await deezerRes.json().catch(() => null);
    const preview = data?.data?.[0]?.preview ?? null;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json({ preview });
  } catch (err) {
    console.error('deezer-preview:', err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: err?.message || 'Error al buscar preview', preview: null });
  }
}

/**
 * Resuelve el enlace directo de un tema en Deezer (para Play cuando no hay enlace guardado).
 * Parámetros: artist, album, track. Devuelve { link } con la URL del tema o { link: null }.
 */
async function handleDeezerResolve(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const artist = (req.query.artist || '').trim().slice(0, 100);
  const album = (req.query.album || '').trim().slice(0, 120);
  const track = (req.query.track || '').trim().slice(0, 120);
  if (!track) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ link: null });
  }
  try {
    const q = [artist, album, track].filter(Boolean).join(' ');
    if (!q) {
      return res.status(200).json({ link: null });
    }
    const url = `${DEEZER_SEARCH}?q=${encodeURIComponent(q)}&limit=1`;
    const deezerRes = await fetch(url, { method: 'GET' });
    if (!deezerRes.ok) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ link: null });
    }
    const data = await deezerRes.json().catch(() => null);
    const link = data?.data?.[0]?.link ?? null;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).json({ link: link || null });
  } catch (err) {
    console.error('deezer-resolve:', err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ link: null });
  }
}

// ---------- router ----------
export default async function handler(req, res) {
  const route = (req.query.route || '').toLowerCase();
  if (route === 'lookup-isbn') return handleLookupIsbn(req, res);
  if (route === 'lookup-disc') return handleLookupDisc(req, res);
  if (route === 'upload-cover') return handleUploadCover(req, res);
  if (route === 'deezer-preview') return handleDeezerPreview(req, res);
  if (route === 'deezer-resolve') return handleDeezerResolve(req, res);
  return res.status(404).json({ error: 'Ruta no encontrada. Use ?route=lookup-isbn|lookup-disc|upload-cover|deezer-preview|deezer-resolve' });
}
