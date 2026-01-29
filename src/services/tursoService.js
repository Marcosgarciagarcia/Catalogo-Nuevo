/**
 * Servicio para conectar con Turso Database
 * Usa el cliente HTTP de Turso para hacer consultas desde el navegador
 */

const TURSO_URL = import.meta.env.VITE_TURSO_DATABASE_URL || 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io';
const TURSO_TOKEN = import.meta.env.VITE_TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA';

/**
 * Ejecuta una query en Turso usando HTTP
 */
async function executeQuery(sql, params = []) {
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

/**
 * Obtiene todos los libros con información de autor y editorial
 */
export async function getAllBooks() {
  const sql = `
    SELECT 
      t.id,
      t.EAN,
      t.titulo,
      t.tituloOriginal,
      t.anyoEdicion,
      t.numeroPaginas,
      t.portada_cloudinary,
      t.sinopsis,
      a.nombreAutor,
      e.descriEditorial as editorial
    FROM core_titulos t
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    ORDER BY t.titulo
  `;
  
  return executeQuery(sql, []);
}

/**
 * Busca libros por título o autor
 */
export async function searchBooks(searchTerm, searchBy = 'titulo') {
  const searchPattern = `%${searchTerm}%`;
  
  let sql;
  if (searchBy === 'titulo') {
    sql = `
      SELECT 
        t.id,
        t.EAN,
        t.titulo,
        t.tituloOriginal,
        t.anyoEdicion,
        t.numeroPaginas,
        t.portada_cloudinary,
        t.sinopsis,
        a.nombreAutor,
        e.descriEditorial as editorial
      FROM core_titulos t
      LEFT JOIN core_autores a ON t.codiAutor_id = a.id
      LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
      WHERE t.titulo LIKE ?
      ORDER BY t.titulo
    `;
  } else {
    sql = `
      SELECT 
        t.id,
        t.EAN,
        t.titulo,
        t.tituloOriginal,
        t.anyoEdicion,
        t.numeroPaginas,
        t.portada_cloudinary,
        t.sinopsis,
        a.nombreAutor,
        e.descriEditorial as editorial
      FROM core_titulos t
      LEFT JOIN core_autores a ON t.codiAutor_id = a.id
      LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
      WHERE a.nombreAutor LIKE ?
      ORDER BY a.nombreAutor, t.titulo
    `;
  }
  
  return executeQuery(sql, [searchPattern]);
}

/**
 * Filtra libros por letra inicial
 */
export async function filterBooksByLetter(letter, filterBy = 'titulo') {
  const letterPattern = `${letter}%`;
  
  let sql;
  if (filterBy === 'titulo') {
    sql = `
      SELECT 
        t.id,
        t.EAN,
        t.titulo,
        t.tituloOriginal,
        t.anyoEdicion,
        t.numeroPaginas,
        t.portada_cloudinary,
        t.sinopsis,
        a.nombreAutor,
        e.descriEditorial as editorial
      FROM core_titulos t
      LEFT JOIN core_autores a ON t.codiAutor_id = a.id
      LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
      WHERE UPPER(t.titulo) LIKE UPPER(?)
      ORDER BY t.titulo
    `;
  } else {
    sql = `
      SELECT 
        t.id,
        t.EAN,
        t.titulo,
        t.tituloOriginal,
        t.anyoEdicion,
        t.numeroPaginas,
        t.portada_cloudinary,
        t.sinopsis,
        a.nombreAutor,
        e.descriEditorial as editorial
      FROM core_titulos t
      LEFT JOIN core_autores a ON t.codiAutor_id = a.id
      LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
      WHERE UPPER(a.nombreAutor) LIKE UPPER(?)
      ORDER BY a.nombreAutor, t.titulo
    `;
  }
  
  return executeQuery(sql, [letterPattern]);
}

/**
 * Obtiene estadísticas del catálogo
 */
export async function getStats() {
  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM core_titulos) as totalLibros,
      (SELECT COUNT(*) FROM core_autores) as totalAutores,
      (SELECT COUNT(*) FROM core_editoriales) as totalEditoriales,
      (SELECT COUNT(*) FROM core_titulos WHERE portada_cloudinary IS NOT NULL) as librosConPortada
  `;
  
  const results = await executeQuery(sql);
  return results[0] || {};
}

/**
 * Obtiene un libro por ID
 */
export async function getBookById(id) {
  const sql = `
    SELECT 
      t.*,
      a.nombreAutor,
      e.descriEditorial as editorial
    FROM core_titulos t
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    WHERE t.id = ?
  `;
  
  const results = await executeQuery(sql, [id]);
  return results[0] || null;
}
