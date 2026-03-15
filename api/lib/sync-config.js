/**
 * Configuración de tablas para sync local → Turso (misma estructura que sync_manager.py).
 * Solo tablas que la webapp usa o que pueden tener pending_pushes.
 */
export const SYNC_TABLE_CONFIG = {
  core_tipos_coleccion: {
    id_field: 'id',
    fields: ['slug', 'nombre', 'orden', 'activo', 'descripcion'],
  },
  core_autores: {
    id_field: 'id',
    fields: ['nombreAutor', 'enlaceWiki', 'enlaceWiki2', 'observaciones', 'created', 'updated'],
  },
  core_editoriales: {
    id_field: 'id',
    fields: ['descriEditorial', 'created', 'updated'],
  },
  core_generos: {
    id_field: 'id',
    fields: ['descriGenero', 'created', 'updated'],
  },
  core_soportes: {
    id_field: 'id',
    fields: ['descriSoporte', 'imagenSoporte', 'codiTipoSoporte_id', 'created', 'updated'],
  },
  core_ubicaciones: {
    id_field: 'id',
    fields: ['descriUbicacion', 'created', 'updated'],
  },
  core_ubicaciones_sub: {
    id_field: 'codiEstante',
    fields: ['descriEstante', 'observaciones', 'codiUbicacion_id', 'created', 'updated'],
  },
  core_titulos: {
    id_field: 'id',
    fields: [
      'EAN', 'titulo', 'numeroEdicion', 'anyoEdicion', 'numeroPaginas',
      'tituloOriginal', 'portada', 'numeroEjemplares', 'codiAutor_id',
      'codiGenero_id', 'codiSoporte_id', 'codiUbicacion_id', 'coleccion',
      'contraportada', 'codiEstante_id', 'serie', 'codiEditorial_id',
      'sinopsis', 'observaciones', 'portada_cloudinary', 'hastag', 'created', 'updated',
    ],
  },
  core_temas: {
    id_field: 'id',
    fields: ['codiTitulo_id', 'numero', 'nombreTema', 'duracion', 'created', 'updated'],
  },
  auth_user: {
    id_field: 'id',
    fields: [
      'password', 'last_login', 'is_superuser', 'username', 'last_name',
      'email', 'is_staff', 'is_active', 'date_joined', 'first_name',
    ],
  },
};
