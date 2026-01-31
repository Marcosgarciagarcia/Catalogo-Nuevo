/**
 * POST /api/media/books/create
 * Crea un nuevo libro (requiere autenticación)
 */

import { executeQuery } from '../../lib/turso.js';
import { authenticateRequest, isStaff } from '../../lib/auth.js';

export default async function handler(req, res) {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar autenticación
    const user = authenticateRequest(req);

    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    // Verificar permisos (staff o admin)
    if (!isStaff(user)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions' 
      });
    }

    // Extraer datos del libro
    const {
      EAN,
      titulo,
      tituloOriginal,
      anyoEdicion,
      numeroPaginas,
      codiAutor_id,
      codiEditorial_id,
      sinopsis,
      portada_cloudinary,
      numeroEdicion,
      numeroEjemplares,
      coleccion,
      serie,
      observaciones
    } = req.body;

    // Validar campos requeridos
    if (!titulo) {
      return res.status(400).json({ 
        error: 'Title is required' 
      });
    }

    // Insertar libro
    const query = `
      INSERT INTO core_titulos (
        EAN,
        titulo,
        tituloOriginal,
        anyoEdicion,
        numeroPaginas,
        codiAutor_id,
        codiEditorial_id,
        sinopsis,
        portada_cloudinary,
        numeroEdicion,
        numeroEjemplares,
        coleccion,
        serie,
        observaciones,
        created,
        updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    const params = [
      EAN || null,
      titulo,
      tituloOriginal || null,
      anyoEdicion || null,
      numeroPaginas || null,
      codiAutor_id || null,
      codiEditorial_id || null,
      sinopsis || null,
      portada_cloudinary || null,
      numeroEdicion || 1,
      numeroEjemplares || null,
      coleccion || null,
      serie || null,
      observaciones || null
    ];

    await executeQuery(query, params);

    // Obtener el ID del libro recién creado
    const lastIdQuery = 'SELECT last_insert_rowid() as id';
    const result = await executeQuery(lastIdQuery);
    const newBookId = result[0].id;

    // Obtener el libro completo con joins
    const getBookQuery = `
      SELECT 
        t.*,
        a.nombreAutor,
        e.descriEditorial as editorial
      FROM core_titulos t
      LEFT JOIN core_autores a ON t.codiAutor_id = a.id
      LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
      WHERE t.id = ?
    `;

    const newBook = await executeQuery(getBookQuery, [newBookId]);

    return res.status(201).json({
      message: 'Book created successfully',
      book: newBook[0]
    });

  } catch (error) {
    console.error('Error in /api/media/books/create:', error);
    return res.status(500).json({ 
      error: 'Error creating book',
      message: error.message 
    });
  }
}
