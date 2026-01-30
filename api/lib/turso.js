/**
 * Cliente Turso para Vercel Functions
 * Protege el token de autenticación en el backend
 */

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

/**
 * Ejecuta una query en Turso Database
 * @param {string} sql - Query SQL
 * @param {Array} params - Parámetros de la query
 * @returns {Promise<Array>} Resultados de la query
 */
export async function executeQuery(sql, params = []) {
  if (!TURSO_URL || !TURSO_TOKEN) {
    throw new Error('Turso credentials not configured');
  }

  try {
    const response = await fetch(TURSO_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        statements: [{
          q: sql,
          params: params
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data[0]?.error) {
      throw new Error(data[0].error);
    }

    const results = data[0]?.results;
    const rows = results?.rows || [];
    const columns = results?.columns || [];

    // Convertir rows a objetos con nombres de columna
    return rows.map(row => {
      const obj = {};
      columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return obj;
    });
  } catch (error) {
    console.error('Error ejecutando query en Turso:', error);
    throw error;
  }
}
