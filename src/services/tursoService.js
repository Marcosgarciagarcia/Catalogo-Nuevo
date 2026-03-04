/**
 * Servicio para obtener datos del catálogo desde la API (backend).
 * No se conecta a Turso desde el navegador; todas las peticiones pasan por /api.
 * No se usa ningún token de base de datos en el frontend.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function apiGet(path, params = {}) {
  const search = new URLSearchParams(params).toString();
  const url = `${API_BASE}${path}${search ? `?${search}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
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
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}
