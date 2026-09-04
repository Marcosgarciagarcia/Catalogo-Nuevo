/**
 * Busca una URL de Wikipedia (es, luego en) para un nombre de persona/artista.
 * Devuelve null si no hay coincidencia razonable.
 */
export async function lookupWikipediaUrl(name) {
  const q = String(name || '').trim();
  if (!q) return null;
  for (const lang of ['es', 'en']) {
    try {
      const url =
        `https://${lang}.wikipedia.org/w/api.php` +
        `?action=opensearch&search=${encodeURIComponent(q)}` +
        `&limit=1&namespace=0&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const link = Array.isArray(data?.[3]) ? data[3][0] : null;
      if (link && typeof link === 'string') return link;
    } catch {
      /* siguiente idioma */
    }
  }
  return null;
}
