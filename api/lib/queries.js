/**
 * Queries SQL para el sistema Casateca
 * Organizadas por tipo de media (libros, música, video)
 */

export const QUERIES = {
  // ==================== TIPOS DE COLECCIÓN (menú dinámico) ====================

  /** Tipos de colección activos para el selector inicial, ordenados */
  GET_TIPOS_COLECCION: `
    SELECT id, slug, nombre, orden, descripcion
    FROM core_tipos_coleccion
    WHERE activo = 1
    ORDER BY orden ASC, nombre ASC
  `,

  // ==================== LIBROS ====================
  // Filtro por tipo de colección: t → core_soportes → core_tipos_coleccion (slug = libros|audio|video)

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

  /** Como GET_ALL_BOOKS pero solo títulos del tipo de colección (slug). Param: slug (ej. 'libros', 'audio', 'video') */
  GET_ALL_BOOKS_BY_TIPO: `
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
    INNER JOIN core_soportes s ON t.codiSoporte_id = s.id
    INNER JOIN core_tipos_coleccion tc ON s.codiTipoSoporte_id = tc.id
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    WHERE tc.slug = ?
    ORDER BY t.titulo
  `,

  /** Libros que contienen el hastag (palabra completa, con #). Param ej: #novela */
  GET_BOOKS_BY_HASTAG: `
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
    WHERE (' ' || COALESCE(t.hastag, '') || ' ') LIKE '% ' || ? || ' %'
    ORDER BY t.titulo
  `,

  /** GET_BOOKS_BY_HASTAG filtrado por tipo. Params: slug, hastag */
  GET_BOOKS_BY_HASTAG_BY_TIPO: `
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
    INNER JOIN core_soportes s ON t.codiSoporte_id = s.id
    INNER JOIN core_tipos_coleccion tc ON s.codiTipoSoporte_id = tc.id
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    WHERE tc.slug = ? AND (' ' || COALESCE(t.hastag, '') || ' ') LIKE '% ' || ? || ' %'
    ORDER BY t.titulo
  `,
  
  GET_BOOK_BY_ID: `
    SELECT 
      t.*,
      a.nombreAutor,
      a.enlaceWiki as autorWiki,
      a.enlaceWiki2 as autorWiki2,
      e.descriEditorial as editorial,
      u.descriUbicacion as ubicacionDesc,
      s.descriEstante as estanteDesc,
      sop.descriSoporte as soporteDesc
    FROM core_titulos t
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    LEFT JOIN core_ubicaciones u ON t.codiUbicacion_id = u.id
    LEFT JOIN core_ubicaciones_sub s ON t.codiEstante_id = s.codiEstante
    LEFT JOIN core_soportes sop ON t.codiSoporte_id = sop.id
    WHERE t.id = ?
  `,

  /** Para validar EAN duplicado antes de crear/autor/editorial en altas; en edición excluir el propio id */
  GET_BOOK_ID_BY_EAN: `SELECT id FROM core_titulos WHERE EAN = ? LIMIT 1`,

  /** Actualizar libro por id (updated = datetime('now') para sincronización LWW) */
  UPDATE_BOOK: `
    UPDATE core_titulos SET
      EAN = ?, titulo = ?, tituloOriginal = ?, anyoEdicion = ?, numeroEdicion = ?, numeroPaginas = ?, numeroEjemplares = ?,
      portada_cloudinary = ?, sinopsis = ?, observaciones = ?, coleccion = ?, serie = ?, hastag = ?,
      codiUbicacion_id = ?, codiEstante_id = ?, codiSoporte_id = ?,
      codiAutor_id = ?, codiEditorial_id = ?, updated = datetime('now')
    WHERE id = ?
  `,

  /** Buscar autor por nombre exacto (evitar duplicados en altas) */
  GET_AUTHOR_ID_BY_NAME: `SELECT id FROM core_autores WHERE nombreAutor = ? LIMIT 1`,

  /** Buscar editorial por nombre exacto (evitar duplicados en altas) */
  GET_PUBLISHER_ID_BY_NAME: `SELECT id FROM core_editoriales WHERE descriEditorial = ? LIMIT 1`,

  /** Ubicaciones para selector en edición de libro */
  GET_UBICACIONES: `SELECT id, descriUbicacion FROM core_ubicaciones ORDER BY descriUbicacion ASC`,

  /** Estantes para selector en edición de libro */
  GET_ESTANTES: `SELECT codiEstante as id, descriEstante, codiUbicacion_id FROM core_ubicaciones_sub ORDER BY descriEstante ASC`,

  /** Soportes para selector en alta/edición de título */
  GET_SOPORTES: `SELECT id, descriSoporte FROM core_soportes ORDER BY descriSoporte ASC`,

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

  SEARCH_BOOKS_BY_TITLE_BY_TIPO: `
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
    INNER JOIN core_soportes s ON t.codiSoporte_id = s.id
    INNER JOIN core_tipos_coleccion tc ON s.codiTipoSoporte_id = tc.id
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    WHERE tc.slug = ? AND t.titulo LIKE ?
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

  SEARCH_BOOKS_BY_AUTHOR_BY_TIPO: `
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
    INNER JOIN core_soportes s ON t.codiSoporte_id = s.id
    INNER JOIN core_tipos_coleccion tc ON s.codiTipoSoporte_id = tc.id
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    WHERE tc.slug = ? AND a.nombreAutor LIKE ?
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

  FILTER_BOOKS_BY_LETTER_TITLE_BY_TIPO: `
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
    INNER JOIN core_soportes s ON t.codiSoporte_id = s.id
    INNER JOIN core_tipos_coleccion tc ON s.codiTipoSoporte_id = tc.id
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    WHERE tc.slug = ? AND UPPER(t.titulo) LIKE UPPER(?)
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

  FILTER_BOOKS_BY_LETTER_AUTHOR_BY_TIPO: `
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
    INNER JOIN core_soportes s ON t.codiSoporte_id = s.id
    INNER JOIN core_tipos_coleccion tc ON s.codiTipoSoporte_id = tc.id
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    WHERE tc.slug = ? AND UPPER(a.nombreAutor) LIKE UPPER(?)
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

  // ==================== INSERTS (altas) ====================
  // created/updated con datetime('now') para cumplir NOT NULL en SQLite/Turso

  INSERT_AUTHOR: `
    INSERT INTO core_autores (nombreAutor, enlaceWiki, enlaceWiki2, created, updated)
    VALUES (?, ?, ?, datetime('now'), datetime('now')) RETURNING id
  `,

  INSERT_PUBLISHER: `
    INSERT INTO core_editoriales (descriEditorial, created, updated)
    VALUES (?, datetime('now'), datetime('now')) RETURNING id
  `,

  INSERT_BOOK: `
    INSERT INTO core_titulos (
      EAN, titulo, tituloOriginal, anyoEdicion, numeroEdicion, numeroPaginas, numeroEjemplares,
      portada_cloudinary, sinopsis, observaciones, coleccion, serie, hastag,
      codiAutor_id, codiEditorial_id, created, updated
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING id
  `,

  /** Para uso en transacción: codiAutor_id y codiEditorial_id por subconsulta por nombre (evita pasar ids entre sentencias) */
  INSERT_BOOK_BY_AUTHOR_AND_PUBLISHER_NAME: `
    INSERT INTO core_titulos (
      EAN, titulo, tituloOriginal, anyoEdicion, numeroEdicion, numeroPaginas, numeroEjemplares,
      portada_cloudinary, sinopsis, observaciones, coleccion, serie, hastag,
      codiSoporte_id,
      codiAutor_id, codiEditorial_id, created, updated
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?,
      (SELECT id FROM core_autores WHERE nombreAutor = ? LIMIT 1),
      (SELECT id FROM core_editoriales WHERE descriEditorial = ? LIMIT 1),
      datetime('now'), datetime('now')
    ) RETURNING id
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
