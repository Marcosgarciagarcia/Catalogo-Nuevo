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

function stripAccents(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * Género musical → hastag(s): una palabra → un solo #token; varias → #última #primera
 * (evita #jazz #jazz cuando el género es solo "jazz").
 */
function hastagTokensFromGenreName(genreName) {
  const g = stripAccents(genreName).toLowerCase().trim();
  const norm = g.replace(/[^a-z0-9]+/g, ' ').trim();
  const words = norm ? norm.split(/\s+/).filter(Boolean) : [];
  if (words.length === 0) return [];
  if (words.length === 1) return [`#${words[0]}`];
  const first = words[0];
  const last = words[words.length - 1];
  if (first === last) return [`#${last}`];
  return [`#${last}`, `#${first}`];
}

/** Quita #tokens repetidos (misma cadena ignorando mayúsculas). */
function uniqueHastagString(tokens) {
  const seen = new Set();
  const out = [];
  for (const raw of tokens) {
    const t = String(raw || '').trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t.startsWith('#') ? t : `#${t}`);
  }
  return out.length ? out.join(' ') : null;
}

async function fetchHastagFromReleaseId(releaseId) {
  try {
    if (!releaseId) return null;
    // Espera para respetar el rate limit de MusicBrainz entre requests.
    await new Promise((r) => setTimeout(r, 1200));

    const rgRes = await fetch(
      `${MUSICBRAINZ_BASE}/release/${encodeURIComponent(
        releaseId,
      )}?inc=release-groups&fmt=json`,
      { headers: { 'User-Agent': MUSICBRAINZ_UA } },
    );
    if (!rgRes.ok) return null;
    const rgData = await rgRes.json().catch(() => null);
    const rgid = rgData?.['release-group']?.id;
    if (!rgid) return null;

    // Espera antes de la request de genres.
    await new Promise((r) => setTimeout(r, 1200));

    const genresRes = await fetch(
      `${MUSICBRAINZ_BASE}/release-group/${encodeURIComponent(
        rgid,
      )}?inc=genres&fmt=json`,
      { headers: { 'User-Agent': MUSICBRAINZ_UA } },
    );
    if (!genresRes.ok) return null;
    const genresData = await genresRes.json().catch(() => null);
    const genres = Array.isArray(genresData?.genres) ? genresData.genres : [];
    if (!genres?.length || !genres[0]?.name) return null;

    const primary = hastagTokensFromGenreName(genres[0].name);
    const extra =
      primary.length === 1 && genres.length > 1 && genres[1]?.name
        ? hastagTokensFromGenreName(genres[1].name).filter(
            (tok) => !primary.some((p) => p.toLowerCase() === tok.toLowerCase()),
          )
        : [];
    return uniqueHastagString([...primary, ...extra].slice(0, 4));
  } catch (_) {
    return null;
  }
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

function parseMusicBrainzReleaseMbidFromInput(str) {
  const s = String(str == null ? '' : str).trim();
  if (!s) return null;
  const m = s.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return m ? m[0].toLowerCase() : null;
}

async function fetchMBReleaseByMbid(mbidOrUrl) {
  try {
    const id = parseMusicBrainzReleaseMbidFromInput(mbidOrUrl);
    if (!id) return null;
    const res = await fetch(`${MUSICBRAINZ_BASE}/release/${encodeURIComponent(id)}?inc=labels&fmt=json`, { headers: { 'User-Agent': MUSICBRAINZ_UA } });
    if (!res.ok) return null;
    const r = await res.json().catch(() => null);
    if (!r || !r.id) return null;
    const artist = artistCreditToName(r['artist-credit']) ?? r['artist-credit']?.[0]?.name ?? r['artist-credit']?.[0]?.artist?.name ?? null;
    let year = null;
    if (r.date) { const match = r.date.match(/\d{4}/); if (match) year = parseInt(match[0], 10); }
    return { releaseId: r.id, title: r.title ?? null, artist, date: r.date ?? null, year, barcode: r.barcode ?? null };
  } catch (_) {
    return null;
  }
}

async function fetchMBReleaseByCatalog(catno, labelName) {
  try {
    const c = (catno || '').trim();
    const l = (labelName || '').trim();
    if (!c && !l) return null;
    const parts = [];
    if (c) parts.push(`catno:${c}`);
    if (l) parts.push(`label:${l}`);
    const query = parts.join(' AND ');
    const res = await fetch(`${MUSICBRAINZ_BASE}/release?query=${encodeURIComponent(query)}&fmt=json&limit=5`, { headers: { 'User-Agent': MUSICBRAINZ_UA } });
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
    const mbidRaw = (req.query.mbid || '').trim();
    const catalog = (req.query.catalog || '').trim();
    const label = (req.query.label || '').trim();
    let first = null;
    if (ean) first = await fetchMBReleaseByBarcode(ean);
    else if (mbidRaw) first = await fetchMBReleaseByMbid(mbidRaw);
    else if (catalog || label) first = await fetchMBReleaseByCatalog(catalog, label);
    else if (artist || release) first = await fetchMBReleaseByQuery(artist, release);
    if (!first) {
      setCors(res);
      return res.status(200).json(null);
    }
    await new Promise((r) => setTimeout(r, 1200));
    const detail = await fetchMBReleaseWithTracks(first.releaseId);
    const hastag = await fetchHastagFromReleaseId(first.releaseId);
    if (!detail) {
      setCors(res);
      return res.status(200).json({
        titulo: first.title,
        autor: first.artist,
        anyoEdicion: first.year,
        editorial: null,
        portadaUrl: null,
        temas: [],
        musicbrainzReleaseMbid: first.releaseId,
        hastag,
      });
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
      musicbrainzReleaseMbid: first.releaseId,
      hastag,
    });
  } catch (err) {
    console.error('lookup-disc:', err);
    setCors(res);
    return res.status(200).json(null);
  }
}

// (fetchMBReleaseWithTracks está definida más arriba; esta duplicada se elimina para evitar sobrescritura)

// ---------- lookup-video (TMDb + TVmaze fallback) ----------
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const TVMAZE_BASE = 'https://api.tvmaze.com';

function getTmdbApiKey() {
  return (process.env.TMDB_API_KEY || '').trim();
}

function tmdbPosterUrl(posterPath) {
  if (!posterPath || typeof posterPath !== 'string') return null;
  return `${TMDB_IMG}${posterPath}`;
}

function yearFromDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const m = dateStr.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : null;
}

function hastagFromGenreList(genres) {
  const list = Array.isArray(genres) ? genres : [];
  const tokens = [];
  for (const g of list.slice(0, 3)) {
    const name = g?.name ?? g;
    if (typeof name === 'string') tokens.push(...hastagTokensFromGenreName(name));
  }
  return uniqueHastagString(tokens.slice(0, 4));
}

async function tmdbGet(path, extraParams = {}) {
  const apiKey = getTmdbApiKey();
  if (!apiKey) throw new Error('TMDB_API_KEY no configurada en el servidor');
  const qs = new URLSearchParams({
    api_key: apiKey,
    language: 'es-ES',
    ...extraParams,
  });
  const res = await fetch(`${TMDB_BASE}${path}?${qs}`);
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

function mapSearchResult(item, mediaType) {
  if (!item || !item.id) return null;
  const title = mediaType === 'tv' ? (item.name ?? item.title) : (item.title ?? item.name);
  const original = mediaType === 'tv' ? item.original_name : item.original_title;
  const dateField = mediaType === 'tv' ? item.first_air_date : item.release_date;
  return {
    id: item.id,
    mediaType,
    titulo: title ?? null,
    tituloOriginal: original ?? null,
    anyoEdicion: yearFromDate(dateField),
    sinopsis: item.overview ?? null,
    portadaUrl: tmdbPosterUrl(item.poster_path),
  };
}

async function fetchTmdbSearch(query, mediaType, year) {
  const q = String(query || '').trim();
  if (!q) return [];
  const params = { query: q };
  if (year) {
    if (mediaType === 'tv') params.first_air_date_year = String(year);
    else params.year = String(year);
  }
  const path = mediaType === 'tv' ? '/search/tv' : '/search/movie';
  const data = await tmdbGet(path, params);
  const results = Array.isArray(data?.results) ? data.results : [];
  return results
    .slice(0, 10)
    .map((item) => mapSearchResult(item, mediaType))
    .filter(Boolean);
}

async function fetchTmdbMovieDetail(id) {
  const movieId = Number(id);
  if (!Number.isInteger(movieId) || movieId <= 0) return null;
  const data = await tmdbGet(`/movie/${movieId}`, { append_to_response: 'credits' });
  if (!data?.id) return null;
  const credits = data.credits || {};
  const director = (credits.crew || []).find((c) => c.job === 'Director')?.name
    ?? (credits.crew || []).find((c) => c.department === 'Directing')?.name
    ?? null;
  const studio = Array.isArray(data.production_companies) && data.production_companies[0]?.name
    ? data.production_companies[0].name
    : null;
  return {
    tipo: 'movie',
    tmdbId: data.id,
    tmdbType: 'movie',
    titulo: data.title ?? null,
    tituloOriginal: data.original_title ?? null,
    serie: null,
    autor: director,
    anyoEdicion: yearFromDate(data.release_date),
    editorial: studio,
    sinopsis: data.overview ?? null,
    portadaUrl: tmdbPosterUrl(data.poster_path),
    hastag: hastagFromGenreList(data.genres),
    numeroPaginas: data.runtime != null ? Number(data.runtime) : null,
    coleccion: data.belongs_to_collection?.name ?? null,
    episodiosReferencia: [],
    temas: [],
  };
}

async function fetchTmdbTvShowDetail(id) {
  const tvId = Number(id);
  if (!Number.isInteger(tvId) || tvId <= 0) return null;
  const data = await tmdbGet(`/tv/${tvId}`);
  if (!data?.id) return null;
  const creator = Array.isArray(data.created_by) && data.created_by[0]?.name
    ? data.created_by.map((c) => c.name).filter(Boolean).join(', ')
    : null;
  const network = Array.isArray(data.networks) && data.networks[0]?.name
    ? data.networks[0].name
    : null;
  const seasons = (Array.isArray(data.seasons) ? data.seasons : [])
    .filter((s) => s.season_number > 0)
    .map((s) => ({
      seasonNumber: s.season_number,
      nombre: s.name ?? `Temporada ${s.season_number}`,
      anyoEdicion: yearFromDate(s.air_date),
      episodioCount: s.episode_count ?? null,
      portadaUrl: tmdbPosterUrl(s.poster_path),
    }));
  return {
    tipo: 'tv-show',
    tmdbId: data.id,
    tmdbType: 'tv',
    serie: data.name ?? null,
    tituloOriginal: data.original_name ?? null,
    autor: creator,
    anyoEdicion: yearFromDate(data.first_air_date),
    editorial: network,
    sinopsis: data.overview ?? null,
    portadaUrl: tmdbPosterUrl(data.poster_path),
    hastag: hastagFromGenreList(data.genres),
    temporadas: seasons,
  };
}

/** Capítulos de temporada → filas core_temas (numeroVolumen = 1 por defecto). */
function buildTemasFromEpisodes(episodios) {
  const eps = Array.isArray(episodios) ? episodios : [];
  return eps
    .filter((ep) => ep && (ep.titulo || '').trim() && Number.isInteger(ep.numero) && ep.numero > 0)
    .map((ep) => ({
      numero: ep.numero,
      titulo: (ep.titulo || '').trim(),
      duracion: ep.duracion ?? null,
      enlace: null,
      numeroVolumen: 1,
    }));
}

async function fetchTmdbTvSeasonDetail(id, season) {
  const tvId = Number(id);
  const seasonNumber = Number(season);
  if (!Number.isInteger(tvId) || tvId <= 0 || !Number.isInteger(seasonNumber) || seasonNumber < 0) return null;

  const [showData, seasonData] = await Promise.all([
    tmdbGet(`/tv/${tvId}`),
    tmdbGet(`/tv/${tvId}/season/${seasonNumber}`),
  ]);
  if (!seasonData?.id) return null;

  const serieName = showData?.name ?? 'Serie';
  const creator = Array.isArray(showData?.created_by) && showData.created_by[0]?.name
    ? showData.created_by.map((c) => c.name).filter(Boolean).join(', ')
    : null;
  const network = Array.isArray(showData?.networks) && showData.networks[0]?.name
    ? showData.networks[0].name
    : null;

  const episodiosReferencia = (Array.isArray(seasonData.episodes) ? seasonData.episodes : []).map((ep) => ({
    numero: ep.episode_number ?? null,
    titulo: ep.name ?? '',
    duracion: ep.runtime != null ? `${ep.runtime} min` : null,
  }));

  const temas = buildTemasFromEpisodes(episodiosReferencia);

  return {
    tipo: 'tv-season',
    tmdbId: tvId,
    tmdbType: 'tv',
    seasonNumber,
    serie: serieName,
    titulo: `${serieName} — Temporada ${seasonNumber}`,
    tituloOriginal: showData?.original_name ?? null,
    autor: creator,
    anyoEdicion: yearFromDate(seasonData.air_date) ?? yearFromDate(showData?.first_air_date),
    editorial: network,
    sinopsis: seasonData.overview || showData?.overview || null,
    portadaUrl: tmdbPosterUrl(seasonData.poster_path) || tmdbPosterUrl(showData?.poster_path),
    hastag: hastagFromGenreList(showData?.genres),
    numeroPaginas: null,
    coleccion: null,
    episodiosReferencia,
    temas,
  };
}

async function fetchTvmazeSeasonDetail(showId, season) {
  const id = Number(showId);
  const seasonNumber = Number(season);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(seasonNumber) || seasonNumber < 0) return null;

  try {
    const [showRes, epsRes] = await Promise.all([
      fetch(`${TVMAZE_BASE}/shows/${id}`),
      fetch(`${TVMAZE_BASE}/shows/${id}/episodes`),
    ]);
    if (!showRes.ok) return null;
    const show = await showRes.json().catch(() => null);
    const allEps = epsRes.ok ? await epsRes.json().catch(() => []) : [];
    if (!show?.id) return null;

    const seasonEps = (Array.isArray(allEps) ? allEps : [])
      .filter((ep) => Number(ep.season) === seasonNumber)
      .map((ep) => ({
        numero: ep.number ?? null,
        titulo: ep.name ?? '',
        duracion: ep.runtime != null ? `${ep.runtime} min` : null,
      }));

    const serieName = show.name ?? 'Serie';
    const temas = buildTemasFromEpisodes(seasonEps);
    const genres = Array.isArray(show.genres) ? show.genres.map((g) => ({ name: g })) : [];

    return {
      tipo: 'tv-season',
      tvmazeId: show.id,
      tmdbType: 'tv',
      seasonNumber,
      serie: serieName,
      titulo: `${serieName} — Temporada ${seasonNumber}`,
      tituloOriginal: null,
      autor: null,
      anyoEdicion: yearFromDate(show.premiered),
      editorial: show.network?.name ?? null,
      sinopsis: show.summary ? String(show.summary).replace(/<[^>]+>/g, '').trim() : null,
      portadaUrl: show.image?.medium ?? show.image?.original ?? null,
      hastag: hastagFromGenreList(genres),
      numeroPaginas: null,
      coleccion: null,
      episodiosReferencia: seasonEps,
      temas,
      source: 'tvmaze',
    };
  } catch (_) {
    return null;
  }
}

async function searchTvmazeShows(query) {
  const q = String(query || '').trim();
  if (!q) return [];
  try {
    const res = await fetch(`${TVMAZE_BASE}/search/shows?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    return (Array.isArray(data) ? data : [])
      .slice(0, 8)
      .map((row) => {
        const show = row?.show;
        if (!show?.id) return null;
        return {
          id: show.id,
          mediaType: 'tvmaze',
          titulo: show.name ?? null,
          tituloOriginal: null,
          anyoEdicion: yearFromDate(show.premiered),
          sinopsis: show.summary ? String(show.summary).replace(/<[^>]+>/g, '').trim() : null,
          portadaUrl: show.image?.medium ?? null,
        };
      })
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

async function handleLookupVideo(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const action = (req.query.action || 'search').toLowerCase();
  setCors(res);

  try {
    if (action === 'search') {
      const query = (req.query.query || req.query.q || '').trim();
      const mediaType = (req.query.mediaType || req.query.type || 'movie').toLowerCase() === 'tv' ? 'tv' : 'movie';
      const year = (req.query.year || '').trim();
      if (!query) return res.status(400).json({ error: 'Parámetro query es obligatorio' });
      const results = await fetchTmdbSearch(query, mediaType, year);
      if (results.length === 0 && mediaType === 'tv') {
        const tvmazeResults = await searchTvmazeShows(query);
        return res.status(200).json({ results: tvmazeResults, source: 'tvmaze' });
      }
      return res.status(200).json({ results, source: 'tmdb' });
    }

    if (action === 'movie') {
      const data = await fetchTmdbMovieDetail(req.query.id);
      return res.status(200).json(data);
    }

    if (action === 'tv-show') {
      const data = await fetchTmdbTvShowDetail(req.query.id);
      return res.status(200).json(data);
    }

    if (action === 'tv-season') {
      let data = await fetchTmdbTvSeasonDetail(req.query.id, req.query.season);
      if (!data && req.query.tvmazeId) {
        data = await fetchTvmazeSeasonDetail(req.query.tvmazeId, req.query.season);
      }
      return res.status(200).json(data);
    }

    if (action === 'tv-season-tvmaze') {
      const data = await fetchTvmazeSeasonDetail(req.query.showId, req.query.season);
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'action no válida' });
  } catch (err) {
    console.error('lookup-video:', err);
    if (String(err?.message || '').includes('TMDB_API_KEY')) {
      return res.status(503).json({ error: err.message });
    }
    return res.status(200).json(null);
  }
}

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
  if (route === 'lookup-video') return handleLookupVideo(req, res);
  if (route === 'upload-cover') return handleUploadCover(req, res);
  if (route === 'deezer-preview') return handleDeezerPreview(req, res);
  if (route === 'deezer-resolve') return handleDeezerResolve(req, res);
  return res.status(404).json({ error: 'Ruta no encontrada. Use ?route=lookup-isbn|lookup-disc|lookup-video|upload-cover|deezer-preview|deezer-resolve' });
}
