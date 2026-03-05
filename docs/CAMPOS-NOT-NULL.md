# Campos NOT NULL en tablas del catálogo (Turso/SQLite)

Listado inferido a partir de los errores de inserción y del uso en el Catálogo Manager. **Comprueba en tu base de datos** con `PRAGMA table_info(nombre_tabla);` para confirmar.

---

## core_autores

| Campo        | NOT NULL | Cómo se cumple en altas                          |
|-------------|----------|--------------------------------------------------|
| **id**      | Sí (PK)  | Autoincrement                                    |
| **nombreAutor** | Sí* | Obligatorio en el body del POST                  |
| **enlaceWiki**  | No   | NULL si no se envía                              |
| **enlaceWiki2** | No   | NULL si no se envía                              |
| **created** | Sí       | `datetime('now')` en INSERT                      |
| **updated** | Sí       | `datetime('now')` en INSERT                      |

\* Inferido: la API exige `nombreAutor` obligatorio.

---

## core_editoriales

| Campo            | NOT NULL | Cómo se cumple en altas                          |
|-----------------|----------|--------------------------------------------------|
| **id**          | Sí (PK)  | Autoincrement                                    |
| **descriEditorial** | Sí* | Obligatorio en el body del POST              |
| **created**     | Sí       | `datetime('now')` en INSERT                      |
| **updated**     | Sí       | `datetime('now')` en INSERT                      |

\* Inferido: la API exige `descriEditorial` obligatorio.

---

## core_titulos

| Campo               | NOT NULL | Cómo se cumple en altas                          |
|--------------------|----------|--------------------------------------------------|
| **id**             | Sí (PK)  | Autoincrement                                    |
| **EAN**            | Sí*      | Obligatorio en el body; se valida antes de insertar |
| **titulo**         | No       | NULL permitido en la API                         |
| **tituloOriginal** | No       | NULL                                             |
| **anyoEdicion**    | No       | NULL                                             |
| **numeroEdicion**  | **Sí**   | Valor por defecto **1** si no se envía           |
| **numeroPaginas** | No       | NULL                                             |
| **portada_cloudinary** | No   | NULL                                             |
| **sinopsis**       | No       | NULL                                             |
| **observaciones**  | No       | NULL                                             |
| **coleccion**      | No       | NULL                                             |
| **serie**          | No       | NULL                                             |
| **codiAutor_id**   | Sí*      | Obligatorio: o se envía id o se crea autor nuevo |
| **codiEditorial_id** | Sí*   | Obligatorio: o se envía id o se crea editorial nueva |
| **created**        | Sí       | `datetime('now')` en INSERT                      |
| **updated**        | Sí       | `datetime('now')` en INSERT                      |

\* Inferido por validación en la API.

---

## Cómo verificar en Turso/SQLite

```bash
# En Turso CLI o cliente SQLite conectado a tu BD:
PRAGMA table_info(core_autores);
PRAGMA table_info(core_editoriales);
PRAGMA table_info(core_titulos);
```

La columna `notnull` será 1 para los campos NOT NULL. Si aparece algún otro campo con NOT NULL que no esté en este listado, hay que añadirlo al INSERT correspondiente en `api/lib/queries.js` y al body en `api/media.js`.
