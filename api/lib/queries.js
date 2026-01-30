/**
 * Queries SQL para el sistema Casateca
 * Organizadas por tipo de media (libros, música, video)
 */

export const QUERIES = {
  // ==================== LIBROS ====================
  
  GET_ALL_BOOKS: `
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
  `,
  
  GET_BOOK_BY_ID: `
    SELECT 
      t.*,
      a.nombreAutor,
      a.enlaceWiki as autorWiki,
      a.enlaceWiki2 as autorWiki2,
      e.descriEditorial as editorial
    FROM core_titulos t
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    WHERE t.id = ?
  `,
  
  SEARCH_BOOKS_BY_TITLE: `
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
  `,
  
  SEARCH_BOOKS_BY_AUTHOR: `
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
  `,
  
  FILTER_BOOKS_BY_LETTER_TITLE: `
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
  `,
  
  FILTER_BOOKS_BY_LETTER_AUTHOR: `
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
  `,
  
  // ==================== AUTORES ====================
  
  GET_ALL_AUTHORS: `
    SELECT 
      a.id,
      a.nombreAutor,
      a.enlaceWiki,
      a.enlaceWiki2,
      COUNT(t.id) as totalLibros
    FROM core_autores a
    LEFT JOIN core_titulos t ON t.codiAutor_id = a.id
    GROUP BY a.id, a.nombreAutor, a.enlaceWiki, a.enlaceWiki2
    ORDER BY a.nombreAutor
  `,
  
  GET_AUTHOR_BY_ID: `
    SELECT 
      a.id,
      a.nombreAutor,
      a.enlaceWiki,
      a.enlaceWiki2,
      a.created,
      a.updated,
      COUNT(t.id) as totalLibros
    FROM core_autores a
    LEFT JOIN core_titulos t ON t.codiAutor_id = a.id
    WHERE a.id = ?
    GROUP BY a.id, a.nombreAutor, a.enlaceWiki, a.enlaceWiki2, a.created, a.updated
  `,
  
  SEARCH_AUTHORS: `
    SELECT 
      a.id,
      a.nombreAutor,
      a.enlaceWiki,
      a.enlaceWiki2,
      COUNT(t.id) as totalLibros
    FROM core_autores a
    LEFT JOIN core_titulos t ON t.codiAutor_id = a.id
    WHERE a.nombreAutor LIKE ?
    GROUP BY a.id, a.nombreAutor, a.enlaceWiki, a.enlaceWiki2
    ORDER BY a.nombreAutor
  `,
  
  // ==================== EDITORIALES ====================
  
  GET_ALL_PUBLISHERS: `
    SELECT 
      e.id,
      e.descriEditorial,
      COUNT(t.id) as totalLibros
    FROM core_editoriales e
    LEFT JOIN core_titulos t ON t.codiEditorial_id = e.id
    GROUP BY e.id, e.descriEditorial
    ORDER BY e.descriEditorial
  `,
  
  GET_PUBLISHER_BY_ID: `
    SELECT 
      e.id,
      e.descriEditorial,
      e.created,
      e.updated,
      COUNT(t.id) as totalLibros
    FROM core_editoriales e
    LEFT JOIN core_titulos t ON t.codiEditorial_id = e.id
    WHERE e.id = ?
    GROUP BY e.id, e.descriEditorial, e.created, e.updated
  `,
  
  SEARCH_PUBLISHERS: `
    SELECT 
      e.id,
      e.descriEditorial,
      COUNT(t.id) as totalLibros
    FROM core_editoriales e
    LEFT JOIN core_titulos t ON t.codiEditorial_id = e.id
    WHERE e.descriEditorial LIKE ?
    GROUP BY e.id, e.descriEditorial
    ORDER BY e.descriEditorial
  `,
  
  // ==================== ESTADÍSTICAS ====================
  
  GET_BOOKS_STATS: `
    SELECT 
      (SELECT COUNT(*) FROM core_titulos) as totalLibros,
      (SELECT COUNT(*) FROM core_autores) as totalAutores,
      (SELECT COUNT(*) FROM core_editoriales) as totalEditoriales,
      (SELECT COUNT(*) FROM core_titulos WHERE portada_cloudinary IS NOT NULL) as librosConPortada,
      (SELECT COUNT(*) FROM core_titulos WHERE portada_cloudinary IS NULL) as librosSinPortada
  `,
  
  // ==================== MÚSICA (Futuro) ====================
  // Queries para álbumes, artistas, sellos discográficos
  
  // ==================== VIDEO (Futuro) ====================
  // Queries para películas, directores, estudios
};
