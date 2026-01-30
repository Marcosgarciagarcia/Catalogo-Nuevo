# Frontend React + Vite conectado a Turso

## ✅ Archivos Creados/Modificados

### 1. **Servicio de Turso** - `src/services/tursoService.js`
Capa de servicio que conecta con Turso usando HTTP API:
- `getAllBooks(limit)` - Obtiene todos los libros
- `searchBooks(searchTerm, searchBy)` - Busca por título o autor
- `filterBooksByLetter(letter, filterBy)` - Filtra por letra inicial
- `getStats()` - Obtiene estadísticas del catálogo
- `getBookById(id)` - Obtiene un libro específico

### 2. **App.jsx actualizado**
- Eliminado el import del JSON estático
- Añadido `useEffect` para cargar datos desde Turso
- Estados de `loading` y `error` para mejor UX
- Búsqueda y filtrado dinámico desde la BD

### 3. **BookList.jsx actualizado**
- Usa el campo `portada_cloudinary` en lugar de `portada`
- Simplificado el componente `BookImage`
- Las URLs de Cloudinary vienen completas desde Turso

## 🚀 Cómo Ejecutar

### Paso 1: Variables de Entorno (OPCIONAL)

Si quieres usar variables de entorno en lugar de las credenciales hardcodeadas, crea el archivo `.env.local`:

```bash
cd C:\Cursos\UOC\Proyecto_Final\Catalogo-Nuevo
```

Crea el archivo `.env.local` con:
```env
VITE_TURSO_DATABASE_URL=https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io
VITE_TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA
```

**NOTA:** Si no creas este archivo, el servicio usará las credenciales por defecto que ya están en el código.

### Paso 2: Instalar Dependencias (si es necesario)

```bash
npm install
```

### Paso 3: Ejecutar el Servidor de Desarrollo

```bash
npm run dev
```

El frontend estará disponible en: **http://localhost:5173**

## 🎯 Funcionalidades

### ✅ Implementadas:
- **Búsqueda por título o autor** - Consulta directa a Turso
- **Filtrado alfabético** - Por letra inicial
- **Paginación** - 10 libros por página
- **Imágenes de Cloudinary** - Usando campo `portada_cloudinary`
- **Estados de carga** - Indicador mientras carga datos
- **Manejo de errores** - Mensajes amigables si falla la conexión

### 📊 Datos Mostrados:
- Título del libro
- Autor
- EAN/ISBN
- Portada (desde Cloudinary)
- Total de resultados

## 🔧 Estructura de Datos

Los libros vienen de Turso con esta estructura:

```javascript
{
  id: 1,
  EAN: "9788420412146",
  titulo: "El Quijote",
  tituloOriginal: "Don Quijote de la Mancha",
  anyoEdicion: "2015",
  numeroPaginas: 1200,
  portada_cloudinary: "https://res.cloudinary.com/casateca/image/upload/v1/libros/9788420412146.jpg",
  sinopsis: "...",
  nombreAutor: "Miguel de Cervantes",
  editorial: "Alianza Editorial"
}
```

## 📝 Notas Importantes

### Campos de Base de Datos:
- **Turso usa minúsculas**: `titulo`, `descriEditorial`, `anyoEdicion`
- **Campo de imagen**: `portada_cloudinary` (URL completa)
- **Joins automáticos**: El servicio hace JOIN con `core_autores` y `core_editoriales`

### Rendimiento:
- Límite por defecto: 500 libros en carga inicial
- Límite en búsquedas: 100 resultados
- Las imágenes usan lazy loading

### CORS:
- Turso permite peticiones HTTP directas desde el navegador
- No necesitas un backend intermedio
- El token está incluido en las peticiones

## 🐛 Solución de Problemas

### Error: "Failed to fetch"
- Verifica que la URL de Turso sea correcta
- Comprueba que el token no haya expirado
- Revisa la consola del navegador para más detalles

### No se cargan las imágenes:
- Verifica que el campo `portada_cloudinary` tenga URLs válidas
- Comprueba que las imágenes existan en Cloudinary
- El componente usa un placeholder si falla la carga

### Búsqueda no funciona:
- Asegúrate de que los nombres de columna sean correctos (minúsculas)
- Verifica en la consola del navegador los errores de SQL

## 🚀 Próximos Pasos

### Mejoras Sugeridas:
1. **Vista de detalle** - Página individual para cada libro
2. **Filtros avanzados** - Por editorial, año, género
3. **Ordenamiento** - Por título, autor, año
4. **Favoritos** - Marcar libros favoritos (localStorage)
5. **Compartir** - URLs directas a libros específicos
6. **Estadísticas** - Dashboard con gráficos

### Optimizaciones:
1. **Caché** - Guardar resultados en localStorage
2. **Infinite scroll** - En lugar de paginación
3. **Búsqueda en tiempo real** - Con debounce
4. **Service Worker** - Para funcionar offline

## 📦 Despliegue

### Vercel (Recomendado):
```bash
npm run build
vercel --prod
```

### Variables de entorno en Vercel:
Añade en el dashboard de Vercel:
- `VITE_TURSO_DATABASE_URL`
- `VITE_TURSO_AUTH_TOKEN`

---

**Fecha:** 29 de enero de 2026  
**Estado:** ✅ Frontend funcional conectado a Turso  
**Total de libros en BD:** 2722
