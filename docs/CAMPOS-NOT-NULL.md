# Estructura de las tablas del catálogo (Turso/SQLite)

Obtenida con `node scripts/schema-info.js` contra la base de datos Turso.

---

## core_autores

| # | Columna      | Tipo           | NOT NULL | Default | PK  |
|---|--------------|----------------|----------|--------|-----|
| 0 | id           | INTEGER        | **Sí**   |        | Sí  |
| 1 | nombreAutor  | varchar(100)   | **Sí**   |        |     |
| 2 | enlaceWiki   | varchar(200)   | No       |        |     |
| 3 | enlaceWiki2  | varchar(200)   | No       |        |     |
| 4 | created      | datetime       | **Sí**   |        |     |
| 5 | updated      | datetime       | **Sí**   |        |     |
| 6 | observaciones| varchar(500)  | No       |        |     |

**Campos NOT NULL:** id, nombreAutor, created, updated

---

## core_editoriales

| # | Columna          | Tipo         | NOT NULL | Default | PK  |
|---|------------------|--------------|----------|--------|-----|
| 0 | id               | INTEGER      | **Sí**   |        | Sí  |
| 1 | descriEditorial  | varchar(100) | No       |        |     |
| 2 | created          | datetime     | **Sí**   |        |     |
| 3 | updated          | datetime     | **Sí**   |        |     |

**Campos NOT NULL:** id, created, updated

---

## core_titulos

| # | Columna            | Tipo         | NOT NULL | Default | PK  |
|---|--------------------|--------------|----------|--------|-----|
| 0 | id                 | INTEGER      | **Sí**   |        | Sí  |
| 1 | EAN                | varchar(13)  | No       |        |     |
| 2 | titulo             | varchar(100) | **Sí**   |        |     |
| 3 | numeroEdicion      | INTEGER      | **Sí**   |        |     |
| 4 | anyoEdicion        | varchar(4)   | No       |        |     |
| 5 | numeroPaginas      | INTEGER      | **Sí**   |        |     |
| 6 | tituloOriginal     | varchar(100) | No       |        |     |
| 7 | portada            | varchar(100) | No       |        |     |
| 8 | numeroEjemplares   | INTEGER      | **Sí**   |        |     |
| 9 | created            | datetime     | **Sí**   |        |     |
| 10| updated            | datetime     | **Sí**   |        |     |
| 11| codiAutor_id       | INTEGER      | No       |        |     |
| 12| codiGenero_id      | INTEGER      | No       |        |     |
| 13| codiSoporte_id     | INTEGER      | No       |        |     |
| 14| codiUbicacion_id   | INTEGER      | No       |        |     |
| 15| coleccion          | varchar(100) | No       |        |     |
| 16| contraportada      | varchar(100) | No       |        |     |
| 17| codiEstante_id     | varchar(6)   | No       |        |     |
| 18| serie              | varchar(100) | No       |        |     |
| 19| codiEditorial_id   | INTEGER      | No       |        |     |
| 20| sinopsis           | TEXT         | No       |        |     |
| 21| observaciones      | TEXT         | No       |        |     |
| 22| portada_cloudinary | TEXT         | No       |        |     |

**Campos NOT NULL:** id, titulo, numeroEdicion, numeroPaginas, numeroEjemplares, created, updated

---

## Resumen para altas (API)

| Tabla            | Campos NOT NULL que debe enviar la API |
|------------------|----------------------------------------|
| **core_autores** | nombreAutor, created, updated (estos dos con `datetime('now')`) |
| **core_editoriales** | created, updated (`datetime('now')`); descriEditorial puede ser NULL en BD |
| **core_titulos** | titulo (nunca NULL, usar `''` si vacío), numeroEdicion, numeroPaginas, numeroEjemplares, created, updated. Valores por defecto recomendados: numeroEdicion=1, numeroEjemplares=1; numeroPaginas puede requerir valor por defecto si no se envía. |
