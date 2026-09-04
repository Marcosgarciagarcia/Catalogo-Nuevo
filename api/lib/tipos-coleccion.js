/**
 * Normaliza y deduplica tipos de colección para el menú.
 * Evita botones duplicados (p. ej. Discoteca=música + discoteca, Videoteca=cine + video)
 * y limpia tabs/espacios en slugs.
 */

const PREFERRED_SLUGS = new Set(['libros', 'musica', 'música', 'cine', 'audio']);

export function cleanSlug(slug) {
  return String(slug ?? '')
    .normalize('NFC')
    .replace(/[\t\r\n]+/g, '')
    .trim();
}

export function cleanNombre(nombre) {
  return String(nombre ?? '')
    .normalize('NFC')
    .replace(/[\t\r\n]+/g, '')
    .trim();
}

function slugRank(slug) {
  const s = cleanSlug(slug).toLowerCase();
  if (PREFERRED_SLUGS.has(s)) return 0;
  // Slugs generados por init-tipos-coleccion: menos preferidos si hay homónimo
  if (s === 'discoteca' || s === 'video' || s === 'videoteca') return 2;
  return 1;
}

/**
 * @param {Array<{id, slug, nombre, orden, descripcion}>} rows
 * @returns {Array}
 */
export function dedupeTiposColeccion(rows) {
  const list = (Array.isArray(rows) ? rows : []).map((r) => ({
    id: r.id,
    slug: cleanSlug(r.slug),
    nombre: cleanNombre(r.nombre),
    orden: r.orden,
    descripcion: r.descripcion ?? null,
  })).filter((r) => r.slug && r.nombre);

  // Agrupar por nombre (sin distinguir mayúsculas)
  const byNombre = new Map();
  for (const row of list) {
    const key = row.nombre.toLowerCase();
    const prev = byNombre.get(key);
    if (!prev) {
      byNombre.set(key, row);
      continue;
    }
    const better =
      slugRank(row.slug) < slugRank(prev.slug) ||
      (slugRank(row.slug) === slugRank(prev.slug) && Number(row.id) < Number(prev.id));
    if (better) byNombre.set(key, row);
  }

  return [...byNombre.values()].sort(
    (a, b) => Number(a.orden) - Number(b.orden) || a.nombre.localeCompare(b.nombre, 'es'),
  );
}
