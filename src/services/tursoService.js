/**
 * Servicio para obtener datos del catálogo desde la API (backend).
 * No se conecta a Turso desde el navegador; todas las peticiones pasan por /api.
 * No se usa ningún token de base de datos en el frontend.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function toErrorMessage(j, fallback) {
  if (!j || typeof j === 'string') return j || fallback;
  const msg = j.error ?? j.message;
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
 * Obtiene todos los libros con información de autor y editorial
 */
export async function getAllBooks() {
  const json = await apiGet('/api/media/books');
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
