/**
 * Utilidades para las API Functions
 */

/**
 * Maneja errores y devuelve respuesta JSON
 */
export function handleError(error, statusCode = 500) {
  console.error('API Error:', error);
  
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify({
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * Devuelve respuesta JSON exitosa
 */
export function handleSuccess(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify(data)
  };
}

/**
 * Maneja preflight CORS
 */
export function handleCors() {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: ''
  };
}

/**
 * Valida parámetros de paginación
 */
export function validatePagination(query) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  
  // Límites razonables
  const validPage = Math.max(1, page);
  const validLimit = Math.min(Math.max(1, limit), 100);
  
  return {
    page: validPage,
    limit: validLimit,
    offset: (validPage - 1) * validLimit
  };
}

/**
 * Calcula metadatos de paginación
 */
export function calculatePagination(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}
