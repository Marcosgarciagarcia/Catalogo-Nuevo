# Altas de autor, editorial y libro: duplicados y transacciones

## Criterio para evitar duplicados (autor y editorial)

No son campos ID: se identifica por **nombre**.

- **Autor**: se considera el mismo autor si `nombreAutor` coincide **exactamente** (tras hacer trim) con uno ya existente.  
  - Antes de crear uno nuevo se hace `GET_AUTHOR_ID_BY_NAME` con el nombre enviado.  
  - Si existe, se usa ese `id` y **no** se inserta otro autor.  
  - Solo se hace INSERT de autor cuando no hay ningún autor con ese nombre.

- **Editorial**: mismo criterio con `descriEditorial`.  
  - Se usa `GET_PUBLISHER_ID_BY_NAME`.  
  - Si existe, se reutiliza ese id.  
  - Solo se hace INSERT de editorial cuando no hay ninguna editorial con ese nombre.

Comparación: **exacta** (sensible a mayúsculas/minúsculas y espacios). Si en el futuro se quisiera “Juan Pérez” = “juan pérez”, se podría usar `LOWER(TRIM(nombreAutor))` en la búsqueda y en la unicidad.

## Transacción al dar de alta un libro

Para que **no** queden autores ni editoriales huérfanas si falla el alta del libro:

1. Se valida el EAN (obligatorio y no duplicado).
2. Se resuelve autor y editorial (por nombre o por id; si es por nombre y no existe, se marcan para crear).
3. La **creación** de autor (si aplica), editorial (si aplica) y libro se hace en **una sola transacción** usando el endpoint **Turso `/v2/pipeline`**:
   - `BEGIN`
   - Opcional: `INSERT` autor (solo si no existía por nombre).
   - Opcional: `INSERT` editorial (solo si no existía por nombre).
   - `INSERT` libro (con `codiAutor_id` y `codiEditorial_id` obtenidos por subconsulta por nombre, para usar el id ya existente o el recién insertado).
   - `COMMIT`
   - `close`

Si cualquier sentencia falla, se hace rollback implícito y **no** se crea autor, ni editorial, ni libro.

El cliente de transacción está en `api/lib/turso.js` (`executePipeline`). La lógica del alta de libro está en `api/media.js` (POST `segment === 'books'`).
