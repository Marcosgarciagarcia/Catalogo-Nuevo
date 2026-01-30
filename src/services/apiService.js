/**
 * Servicio API para conectar con el backend
 * Reemplaza la conexión directa a Turso por seguridad
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Maneja errores de la API
 */
async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Obtiene todos los libros con filtros opcionales
 * @param {Object} params - Parámetros de búsqueda y filtrado
 * @returns {Promise<Object>} Libros y metadatos
 */
export async function getAllBooks(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/media/books${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url);
  return handleResponse(response);
}

/**
 * Busca libros por término
 * @param {string} searchTerm - Término de búsqueda
 * @param {string} searchBy - Campo de búsqueda (titulo|autor)
 * @returns {Promise<Object>} Resultados de búsqueda
 */
export async function searchBooks(searchTerm, searchBy = 'titulo') {
  return getAllBooks({ search: searchTerm, searchBy });
}

/**
 * Filtra libros por letra inicial
 * @param {string} letter - Letra inicial
 * @param {string} filterBy - Campo de filtro (titulo|autor)
 * @returns {Promise<Object>} Libros filtrados
 */
export async function filterBooksByLetter(letter, filterBy = 'titulo') {
  return getAllBooks({ letter, filterBy });
}

/**
 * Obtiene un libro por ID
 * @param {number} id - ID del libro
 * @returns {Promise<Object>} Detalle del libro
 */
export async function getBookById(id) {
  const response = await fetch(`${API_BASE_URL}/media/books/${id}`);
  return handleResponse(response);
}

/**
 * Obtiene todos los autores
 * @param {Object} params - Parámetros de búsqueda
 * @returns {Promise<Object>} Autores y metadatos
 */
export async function getAllAuthors(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/media/authors${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url);
  return handleResponse(response);
}

/**
 * Obtiene un autor por ID
 * @param {number} id - ID del autor
 * @returns {Promise<Object>} Detalle del autor
 */
export async function getAuthorById(id) {
  const response = await fetch(`${API_BASE_URL}/media/authors/${id}`);
  return handleResponse(response);
}

/**
 * Obtiene todas las editoriales
 * @param {Object} params - Parámetros de búsqueda
 * @returns {Promise<Object>} Editoriales y metadatos
 */
export async function getAllPublishers(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/media/publishers${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url);
  return handleResponse(response);
}

/**
 * Obtiene una editorial por ID
 * @param {number} id - ID de la editorial
 * @returns {Promise<Object>} Detalle de la editorial
 */
export async function getPublisherById(id) {
  const response = await fetch(`${API_BASE_URL}/media/publishers/${id}`);
  return handleResponse(response);
}

/**
 * Obtiene estadísticas del catálogo de libros
 * @returns {Promise<Object>} Estadísticas
 */
export async function getStats() {
  const response = await fetch(`${API_BASE_URL}/stats/books`);
  return handleResponse(response);
}
