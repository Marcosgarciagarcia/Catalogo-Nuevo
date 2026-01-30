# Arquitectura API - Sistema Casateca

**Fecha:** 30 de enero de 2026  
**Versión:** 1.0 - Backend API con Vercel Functions

---

## 🎯 Visión del Sistema

### **Sistema Multimedia Completo (Futuro)**

```
CASATECA - Sistema de Gestión Multimedia Personal
│
├── 📚 LIBROS (Fase 1 - Actual)
│   ├── Títulos
│   ├── Autores
│   └── Editoriales
│
├── 🎵 MÚSICA (Fase 2 - Futuro)
│   ├── Álbumes
│   ├── Artistas
│   ├── Sellos discográficos
│   └── Formatos: CD, Vinilo, Cassette, Digital
│
└── 🎬 VIDEO (Fase 3 - Futuro)
    ├── Películas/Series
    ├── Directores/Actores
    ├── Estudios
    └── Formatos: DVD, Blu-ray, Digital
```

---

## 🏗️ Arquitectura API

### **Estructura de Rutas**

```
/api
├── /media
│   ├── /books
│   │   ├── GET     /           - Listar todos los libros
│   │   ├── GET     /:id        - Detalle de libro
│   │   ├── GET     /search     - Buscar libros
│   │   ├── POST    /           - Crear libro (futuro)
│   │   ├── PUT     /:id        - Actualizar libro (futuro)
│   │   └── DELETE  /:id        - Eliminar libro (futuro)
│   │
│   ├── /authors
│   │   ├── GET     /           - Listar autores
│   │   ├── GET     /:id        - Detalle de autor
│   │   ├── POST    /           - Crear autor (futuro)
│   │   └── PUT     /:id        - Actualizar autor (futuro)
│   │
│   ├── /publishers
│   │   ├── GET     /           - Listar editoriales
│   │   ├── GET     /:id        - Detalle de editorial
│   │   ├── POST    /           - Crear editorial (futuro)
│   │   └── PUT     /:id        - Actualizar editorial (futuro)
│   │
│   ├── /music (Fase 2 - Futuro)
│   │   ├── /albums
│   │   ├── /artists
│   │   └── /labels
│   │
│   └── /video (Fase 3 - Futuro)
│       ├── /movies
│       ├── /directors
│       └── /studios
│
├── /stats
│   ├── GET /books              - Estadísticas de libros
│   ├── GET /music              - Estadísticas de música (futuro)
│   └── GET /video              - Estadísticas de video (futuro)
│
└── /auth (Fase 2 - Futuro CRUD)
    ├── POST /login             - Autenticación
    ├── POST /logout            - Cerrar sesión
    └── GET  /me                - Usuario actual
```

---

## 📦 Fase 1: Implementación Actual (1-2 días)

### **Objetivo:**
Proteger el token de Turso moviendo la lógica al backend (Vercel Functions)

### **Endpoints a Implementar:**

#### **1. GET /api/media/books**
Listar todos los libros con paginación

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Libros por página (default: 10)
- `search` (opcional): Término de búsqueda
- `searchBy` (opcional): Campo de búsqueda (titulo|autor)
- `letter` (opcional): Filtrar por letra inicial

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "EAN": "9788420412146",
      "titulo": "Cien años de soledad",
      "tituloOriginal": "Cien años de soledad",
      "anyoEdicion": "1967",
      "numeroPaginas": 471,
      "portada_cloudinary": "https://...",
      "sinopsis": "...",
      "nombreAutor": "Gabriel García Márquez",
      "editorial": "Editorial Sudamericana"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2723,
    "totalPages": 273
  }
}
```

#### **2. GET /api/media/books/:id**
Detalle de un libro específico

**Response:**
```json
{
  "id": 1,
  "EAN": "9788420412146",
  "titulo": "Cien años de soledad",
  "tituloOriginal": "Cien años de soledad",
  "numeroEdicion": 1,
  "anyoEdicion": "1967",
  "numeroPaginas": 471,
  "numeroEjemplares": 1,
  "coleccion": "Biblioteca García Márquez",
  "serie": null,
  "portada_cloudinary": "https://...",
  "sinopsis": "...",
  "observaciones": null,
  "nombreAutor": "Gabriel García Márquez",
  "editorial": "Editorial Sudamericana",
  "created": "2021-01-01T00:00:00Z",
  "updated": "2026-01-30T12:00:00Z"
}
```

#### **3. GET /api/media/authors**
Listar autores

**Query Parameters:**
- `search` (opcional): Buscar por nombre

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "nombreAutor": "Gabriel García Márquez",
      "enlaceWiki": "https://es.wikipedia.org/wiki/Gabriel_García_Márquez",
      "enlaceWiki2": null,
      "totalLibros": 5
    }
  ],
  "total": 1443
}
```

#### **4. GET /api/media/publishers**
Listar editoriales

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "descriEditorial": "Editorial Sudamericana",
      "totalLibros": 42
    }
  ],
  "total": 581
}
```

#### **5. GET /api/stats/books**
Estadísticas del catálogo de libros

**Response:**
```json
{
  "totalLibros": 2723,
  "totalAutores": 1443,
  "totalEditoriales": 581,
  "librosConPortada": 2100,
  "librosSinPortada": 623,
  "ultimaActualizacion": "2026-01-30T12:00:00Z"
}
```

---

## 🔒 Seguridad

### **Variables de Entorno (.env.local)**

```env
# Turso Database
TURSO_DATABASE_URL=https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...

# CORS (opcional)
ALLOWED_ORIGINS=https://tu-dominio.vercel.app,http://localhost:5173
```

### **Vercel Environment Variables**

En el dashboard de Vercel:
1. Settings → Environment Variables
2. Añadir:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
3. Scope: Production, Preview, Development

---

## 📁 Estructura de Archivos

```
/api
├── /media
│   ├── /books
│   │   ├── index.js          - GET /api/media/books
│   │   ├── [id].js           - GET /api/media/books/:id
│   │   └── search.js         - GET /api/media/books/search
│   ├── /authors
│   │   ├── index.js          - GET /api/media/authors
│   │   └── [id].js           - GET /api/media/authors/:id
│   └── /publishers
│       ├── index.js          - GET /api/media/publishers
│       └── [id].js           - GET /api/media/publishers/:id
├── /stats
│   └── books.js              - GET /api/stats/books
└── /lib
    ├── turso.js              - Cliente Turso
    ├── queries.js            - Queries SQL
    └── utils.js              - Utilidades
```

---

## 🛠️ Implementación Técnica

### **Cliente Turso (api/lib/turso.js)**

```javascript
/**
 * Cliente para conectar con Turso Database
 * Solo accesible desde el backend (Vercel Functions)
 */

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

export async function executeQuery(sql, params = []) {
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

    // Convertir rows a objetos
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
```

### **Queries SQL (api/lib/queries.js)**

```javascript
export const QUERIES = {
  // Libros
  GET_ALL_BOOKS: `
    SELECT 
      t.id, t.EAN, t.titulo, t.tituloOriginal,
      t.anyoEdicion, t.numeroPaginas, t.portada_cloudinary,
      t.sinopsis, a.nombreAutor, e.descriEditorial as editorial
    FROM core_titulos t
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    ORDER BY t.titulo
  `,
  
  GET_BOOK_BY_ID: `
    SELECT 
      t.*, a.nombreAutor, e.descriEditorial as editorial
    FROM core_titulos t
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    WHERE t.id = ?
  `,
  
  SEARCH_BOOKS_BY_TITLE: `
    SELECT 
      t.id, t.EAN, t.titulo, t.tituloOriginal,
      t.anyoEdicion, t.numeroPaginas, t.portada_cloudinary,
      t.sinopsis, a.nombreAutor, e.descriEditorial as editorial
    FROM core_titulos t
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    WHERE t.titulo LIKE ?
    ORDER BY t.titulo
  `,
  
  SEARCH_BOOKS_BY_AUTHOR: `
    SELECT 
      t.id, t.EAN, t.titulo, t.tituloOriginal,
      t.anyoEdicion, t.numeroPaginas, t.portada_cloudinary,
      t.sinopsis, a.nombreAutor, e.descriEditorial as editorial
    FROM core_titulos t
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    WHERE a.nombreAutor LIKE ?
    ORDER BY a.nombreAutor, t.titulo
  `,
  
  FILTER_BOOKS_BY_LETTER: `
    SELECT 
      t.id, t.EAN, t.titulo, t.tituloOriginal,
      t.anyoEdicion, t.numeroPaginas, t.portada_cloudinary,
      t.sinopsis, a.nombreAutor, e.descriEditorial as editorial
    FROM core_titulos t
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    WHERE UPPER(t.titulo) LIKE UPPER(?)
    ORDER BY t.titulo
  `,
  
  // Autores
  GET_ALL_AUTHORS: `
    SELECT 
      a.id, a.nombreAutor, a.enlaceWiki, a.enlaceWiki2,
      COUNT(t.id) as totalLibros
    FROM core_autores a
    LEFT JOIN core_titulos t ON t.codiAutor_id = a.id
    GROUP BY a.id
    ORDER BY a.nombreAutor
  `,
  
  // Editoriales
  GET_ALL_PUBLISHERS: `
    SELECT 
      e.id, e.descriEditorial,
      COUNT(t.id) as totalLibros
    FROM core_editoriales e
    LEFT JOIN core_titulos t ON t.codiEditorial_id = e.id
    GROUP BY e.id
    ORDER BY e.descriEditorial
  `,
  
  // Estadísticas
  GET_BOOKS_STATS: `
    SELECT 
      (SELECT COUNT(*) FROM core_titulos) as totalLibros,
      (SELECT COUNT(*) FROM core_autores) as totalAutores,
      (SELECT COUNT(*) FROM core_editoriales) as totalEditoriales,
      (SELECT COUNT(*) FROM core_titulos WHERE portada_cloudinary IS NOT NULL) as librosConPortada
  `
};
```

---

## 🔄 Migración del Frontend

### **Antes (Conexión Directa a Turso):**
```javascript
// src/services/tursoService.js
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...'; // ❌ EXPUESTO
```

### **Después (Uso de API Backend):**
```javascript
// src/services/apiService.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export async function getAllBooks(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE_URL}/media/books?${queryString}`);
  return response.json();
}
```

---

## 🚀 Despliegue en Vercel

### **Paso 1: Configurar Variables de Entorno**
```bash
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
```

### **Paso 2: Desplegar**
```bash
vercel --prod
```

### **Paso 3: Verificar**
```bash
curl https://tu-proyecto.vercel.app/api/media/books
```

---

## 📈 Roadmap de Expansión

### **Fase 2: Música (Futuro)**

**Tablas:**
```sql
CREATE TABLE core_albums (
  id INTEGER PRIMARY KEY,
  titulo TEXT,
  artista_id INTEGER,
  sello_id INTEGER,
  formato TEXT, -- CD, Vinilo, Cassette, Digital
  año INTEGER,
  portada_cloudinary TEXT,
  created DATETIME,
  updated DATETIME
);

CREATE TABLE core_artistas (
  id INTEGER PRIMARY KEY,
  nombreArtista TEXT,
  enlaceWiki TEXT,
  created DATETIME,
  updated DATETIME
);

CREATE TABLE core_sellos (
  id INTEGER PRIMARY KEY,
  nombreSello TEXT,
  created DATETIME,
  updated DATETIME
);
```

### **Fase 3: Video (Futuro)**

**Tablas:**
```sql
CREATE TABLE core_peliculas (
  id INTEGER PRIMARY KEY,
  titulo TEXT,
  director_id INTEGER,
  estudio_id INTEGER,
  formato TEXT, -- DVD, Blu-ray, Digital
  año INTEGER,
  portada_cloudinary TEXT,
  created DATETIME,
  updated DATETIME
);

CREATE TABLE core_directores (
  id INTEGER PRIMARY KEY,
  nombreDirector TEXT,
  enlaceWiki TEXT,
  created DATETIME,
  updated DATETIME
);

CREATE TABLE core_estudios (
  id INTEGER PRIMARY KEY,
  nombreEstudio TEXT,
  created DATETIME,
  updated DATETIME
);
```

---

## 🎯 Beneficios de esta Arquitectura

1. **Escalabilidad:** Fácil añadir nuevos tipos de media
2. **Consistencia:** Misma estructura para libros, música y video
3. **Seguridad:** Token protegido en el backend
4. **Mantenibilidad:** Código organizado y modular
5. **Preparado para CRUD:** Estructura lista para operaciones de escritura

---

**Próximo paso:** Implementar las Vercel Functions para Fase 1 (Libros)
