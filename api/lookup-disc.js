/**
 * GET /api/lookup-disc?ean=xxx  o  ?artist=xxx&release=xxx
 * Busca datos de un disco en MusicBrainz + Cover Art Archive (mismo criterio que el doc SERVICIOS_DISCOGRAFIA.md).
 * Para uso desde la app de escritorio y la webapp. No requiere autenticación.
 * Límite MusicBrainz: 1 petición/segundo; se aplican pausas de 1,2 s.
 */

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

async function fetchMusicBrainzReleaseByBarcode(ean) {
  const clean = String(ean).replace(/\D/g, '').trim();
  if (!clean) return null;
  const url = `${MUSICBRAINZ_BASE}/release?query=barcode:${encodeURIComponent(clean)}&fmt=json&limit=5`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data?.releases?.length) return null;
  const r = data.releases[0];
  const artist = r['artist-credit']?.[0]?.name ?? r['artist-credit']?.[0]?.artist?.name ?? null;
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

async function fetchMusicBrainzReleaseByQuery(artist, releaseTitle) {
  const parts = [];
  if (artist && String(artist).trim()) parts.push(`artist:${encodeURIComponent(String(artist).trim())}`);
  if (releaseTitle && String(releaseTitle).trim()) parts.push(`release:${encodeURIComponent(String(releaseTitle).trim())}`);
  if (parts.length === 0) return null;
  const query = parts.join('+');
  const url = `${MUSICBRAINZ_BASE}/release?query=${query}&fmt=json&limit=5`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data?.releases?.length) return null;
  const r = data.releases[0];
  const artistName = r['artist-credit']?.[0]?.name ?? r['artist-credit']?.[0]?.artist?.name ?? null;
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

async function fetchMusicBrainzReleaseWithTracks(releaseId) {
  if (!releaseId) return null;
  const url = `${MUSICBRAINZ_BASE}/release/${encodeURIComponent(releaseId)}?inc=recordings&fmt=json`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT },
  });
  if (!res.ok) return null;
  const r = await res.json().catch(() => null);
  if (!r || !r.id) return null;
  const artist = r['artist-credit']?.[0]?.name ?? r['artist-credit']?.[0]?.artist?.name ?? null;
  let year = null;
  if (r.date) {
    const match = r.date.match(/\d{4}/);
    if (match) year = parseInt(match[0], 10);
  }
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
    temas,
  };
}

async function fetchCoverArtArchiveRelease(mbid) {
  if (!mbid) return null;
  const res = await fetch(`${COVERART_BASE}/release/${mbid}`, {
    method: 'GET',
    headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data?.images?.length) return null;
  const front = data.images.find((i) => i.front === true) ?? data.images[0];
  return front?.image ?? null;
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
  const ean = (req.query.ean || '').replace(/\D/g, '').trim();
  const artist = (req.query.artist || '').trim();
  const release = (req.query.release || req.query.title || '').trim();

  let first = null;
  if (ean) {
    first = await fetchMusicBrainzReleaseByBarcode(ean);
  } else if (artist || release) {
    first = await fetchMusicBrainzReleaseByQuery(artist, release);
  }
  if (!first) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(null);
  }

  await new Promise((r) => setTimeout(r, 1200));
  const detail = await fetchMusicBrainzReleaseWithTracks(first.releaseId);
  if (!detail) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      titulo: first.title,
      autor: first.artist,
      anyoEdicion: first.year,
      portadaUrl: null,
      temas: [],
    });
  }

  let portadaUrl = null;
  try {
    await new Promise((r) => setTimeout(r, 1200));
    portadaUrl = await fetchCoverArtArchiveRelease(first.releaseId);
  } catch (_) {}

  const data = {
    titulo: detail.title,
    autor: detail.artist,
    anyoEdicion: detail.year,
    portadaUrl: portadaUrl ?? null,
    temas: detail.temas ?? [],
  };
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(data);
}
