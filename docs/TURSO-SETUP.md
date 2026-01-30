# Guía de Configuración de Turso para Catálogo-Nuevo

## 📋 Requisitos Previos

- Node.js instalado ✅
- Cuenta en GitHub ✅
- Proyecto Catalogo-Nuevo clonado ✅

## 🚀 Pasos para Configurar Turso

### 1. Crear Cuenta en Turso

1. Ve a: **https://turso.tech**
2. Haz clic en **"Sign Up"** o **"Get Started"**
3. Selecciona **"Continue with GitHub"**
4. Autoriza la aplicación Turso

### 2. Crear tu Base de Datos

Una vez dentro del dashboard de Turso:

1. Haz clic en **"Create Database"**
2. Nombre sugerido: `catalogo-prueba` o `catalogo-biblioteca`
3. Selecciona la región más cercana (Europe para España)
4. Haz clic en **"Create"**

### 3. Obtener Credenciales

En el dashboard de tu base de datos:

1. **URL de la base de datos:**
   - Busca "Database URL" o "libsql URL"
   - Copia la URL completa (ejemplo: `libsql://catalogo-prueba-tu-usuario.turso.io`)

2. **Token de autenticación:**
   - Busca "Create Token" o "Auth Tokens"
   - Haz clic en "Create Token"
   - Copia el token generado (empieza con `eyJ...`)
   - ⚠️ **IMPORTANTE:** Guarda este token, no podrás verlo de nuevo

### 4. Configurar Variables de Entorno

1. Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Copia el archivo de ejemplo
copy .env.example .env.local
```

2. Edita `.env.local` y añade tus credenciales:

```env
TURSO_DATABASE_URL=libsql://catalogo-prueba-tu-usuario.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

### 5. Instalar Dependencias

```bash
npm install
```

Esto instalará `@libsql/client` que ya está en el `package.json`.

### 6. Ejecutar Migración

```bash
npm run migrate
```

Este comando:
- ✅ Creará las tablas en Turso
- ✅ Migrará todos los datos del JSON a Turso
- ✅ Creará índices para búsquedas rápidas
- ✅ Verificará la integridad de los datos

### 7. Verificar Migración

El script mostrará:
- Total de libros en el JSON
- Libros insertados exitosamente
- Libros omitidos (duplicados)
- Errores (si los hay)
- Primeros 5 registros como muestra

**Ejemplo de salida exitosa:**
```
🚀 Iniciando migración de JSON a Turso...

📋 Creando esquema de base de datos...
✅ Esquema creado exitosamente
📖 Leyendo datos del JSON...
📚 Encontrados 1234 libros para migrar
💾 Insertando datos en Turso...
   Progreso: 100/1234 (8%)
   Progreso: 200/1234 (16%)
   ...
   Progreso: 1234/1234 (100%)

📊 Resumen de migración:
   Total en JSON: 1234
   ✅ Insertados: 1234
   ⏭️  Omitidos (duplicados): 0
   ❌ Errores: 0

✅ Verificando integridad de datos...
   Total de registros en Turso: 1234

📖 Primeros 5 registros en Turso:
┌─────┬──────────────┬─────────────────────────┬────────────────┐
│ id  │ ean          │ titulo                  │ nombre_autor   │
├─────┼──────────────┼─────────────────────────┼────────────────┤
│ 1   │ 9781405...   │ The Best Bear in...     │ A A Milne      │
│ 2   │ 8474860113   │ Apuntes de Meteorología │ A Jansa        │
└─────┴──────────────┴─────────────────────────┴────────────────┘

👥 Total de autores únicos: 456

🎉 ¡Migración completada exitosamente!
```

## 🔍 Explorar tu Base de Datos

### Opción 1: Dashboard Web de Turso

1. Ve a https://turso.tech/app
2. Selecciona tu base de datos
3. Ve a la pestaña "SQL Console"
4. Ejecuta consultas SQL directamente

**Consultas de ejemplo:**
```sql
-- Ver todos los libros
SELECT * FROM libros LIMIT 10;

-- Buscar por autor
SELECT * FROM libros WHERE nombre_autor LIKE '%García%';

-- Contar libros por autor
SELECT nombre_autor, COUNT(*) as total 
FROM libros 
GROUP BY nombre_autor 
ORDER BY total DESC 
LIMIT 10;

-- Buscar por título
SELECT * FROM libros WHERE titulo LIKE '%Harry Potter%';
```

### Opción 2: Desde tu Código

Crea un archivo `test-turso.js`:

```javascript
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const result = await db.execute('SELECT COUNT(*) as total FROM libros');
console.log(`Total de libros: ${result.rows[0].total}`);
```

Ejecutar:
```bash
node --env-file=.env.local test-turso.js
```

## 📊 Estructura de la Base de Datos

### Tabla: `libros`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER | ID único (auto-incremento) |
| `ean` | TEXT | Código EAN del libro (único) |
| `titulo` | TEXT | Título del libro |
| `nombre_autor` | TEXT | Nombre del autor |
| `portada_public_id` | TEXT | ID público en Cloudinary |
| `portada_url` | TEXT | URL de la portada en Cloudinary |
| `created_at` | DATETIME | Fecha de creación |
| `updated_at` | DATETIME | Fecha de actualización |

### Índices Creados

- `idx_ean`: Búsqueda rápida por EAN
- `idx_autor`: Búsqueda rápida por autor
- `idx_titulo`: Búsqueda rápida por título

## 🔧 Solución de Problemas

### Error: "No se puede conectar a Turso"

**Causa:** Credenciales incorrectas o no configuradas

**Solución:**
1. Verifica que `.env.local` existe
2. Verifica que las credenciales son correctas
3. Asegúrate de que no hay espacios extra en las variables

### Error: "UNIQUE constraint failed"

**Causa:** Intentas insertar un libro con un EAN que ya existe

**Solución:** El script automáticamente omite duplicados. Si quieres limpiar la BD:

```javascript
// Crear archivo clean-db.js
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

await db.execute('DELETE FROM libros');
console.log('✅ Base de datos limpiada');
```

Ejecutar:
```bash
node --env-file=.env.local clean-db.js
npm run migrate
```

### Error: "Cannot find module '@libsql/client'"

**Solución:**
```bash
npm install
```

## 📝 Próximos Pasos

Una vez completada la migración:

1. **Actualizar la aplicación React** para usar Turso en lugar del JSON
2. **Crear API endpoints** en Vercel Functions
3. **Implementar CRUD** (Crear, Leer, Actualizar, Eliminar)
4. **Añadir autenticación** para operaciones de escritura
5. **Desplegar en producción**

## 🆘 Soporte

Si tienes problemas:

1. Revisa la documentación oficial: https://docs.turso.tech
2. Verifica los logs del script de migración
3. Consulta el dashboard de Turso para ver el estado de tu BD
4. Contacta al equipo de desarrollo

## 📚 Recursos Adicionales

- **Documentación Turso:** https://docs.turso.tech
- **Ejemplos de código:** https://github.com/tursodatabase/examples
- **Comunidad Discord:** https://discord.gg/turso
- **Documentación @libsql/client:** https://www.npmjs.com/package/@libsql/client

---

**Última actualización:** 28 de enero de 2026  
**Proyecto:** Catálogo-Nuevo  
**Repositorio:** https://github.com/Marcosgarciagarcia/Catalogo-Nuevo
