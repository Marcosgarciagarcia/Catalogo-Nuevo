# Guía de Despliegue - Casateca

## 📋 Preparación

### 1. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto (NO lo subas a Git):

```env
# Backend API - Vercel Functions
TURSO_DATABASE_URL=https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA
```

---

## 🧪 Prueba Local

### 1. Instalar dependencias
```bash
npm install
```

### 2. Iniciar servidor de desarrollo
```bash
npm run dev
```

### 3. Probar endpoints de la API

**Libros:**
```bash
curl http://localhost:5173/api/media/books
curl http://localhost:5173/api/media/books/1
curl "http://localhost:5173/api/media/books?search=quijote"
curl "http://localhost:5173/api/media/books?letter=A"
```

**Autores:**
```bash
curl http://localhost:5173/api/media/authors
curl http://localhost:5173/api/media/authors/1
```

**Editoriales:**
```bash
curl http://localhost:5173/api/media/publishers
```

**Estadísticas:**
```bash
curl http://localhost:5173/api/stats/books
```

---

## 🚀 Despliegue en Vercel

### Opción 1: Desde el Dashboard de Vercel (Recomendado)

1. **Ir a [vercel.com](https://vercel.com)** e iniciar sesión

2. **Importar proyecto:**
   - Click en "Add New" → "Project"
   - Conectar con GitHub
   - Seleccionar repositorio `Catalogo-Nuevo`

3. **Configurar variables de entorno:**
   - En "Environment Variables" añadir:
     - `TURSO_DATABASE_URL` = `https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io`
     - `TURSO_AUTH_TOKEN` = `[tu token completo]`
   - Aplicar a: Production, Preview, Development

4. **Configuración del proyecto:**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. **Deploy:**
   - Click en "Deploy"
   - Esperar a que termine el build

---

### Opción 2: Desde CLI de Vercel

1. **Instalar Vercel CLI:**
```bash
npm install -g vercel
```

2. **Login:**
```bash
vercel login
```

3. **Configurar variables de entorno:**
```bash
vercel env add TURSO_DATABASE_URL
# Pegar: https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io

vercel env add TURSO_AUTH_TOKEN
# Pegar el token completo
```

4. **Desplegar:**
```bash
# Despliegue de prueba
vercel

# Despliegue a producción
vercel --prod
```

---

## ✅ Verificación Post-Despliegue

### 1. Verificar que la API funciona

Reemplaza `tu-proyecto.vercel.app` con tu URL de Vercel:

```bash
# Probar endpoint de libros
curl https://tu-proyecto.vercel.app/api/media/books

# Probar estadísticas
curl https://tu-proyecto.vercel.app/api/stats/books
```

### 2. Verificar que el frontend carga

Abrir en navegador: `https://tu-proyecto.vercel.app`

### 3. Verificar seguridad del token

1. Abrir DevTools (F12)
2. Ir a "Network" → "Fetch/XHR"
3. Recargar la página
4. Verificar que las peticiones van a `/api/media/books`
5. **IMPORTANTE:** Verificar que el token NO aparece en ninguna petición del navegador

---

## 🔒 Seguridad

### ✅ Token Protegido

El token de Turso ahora está:
- ❌ **NO** en el código fuente del frontend
- ❌ **NO** accesible desde el navegador
- ✅ **SÍ** solo en el backend (Vercel Functions)
- ✅ **SÍ** en variables de entorno de Vercel

### ✅ CORS Configurado

Las API Functions permiten peticiones desde cualquier origen. Si quieres restringirlo:

Editar `api/lib/utils.js`:
```javascript
'Access-Control-Allow-Origin': 'https://tu-dominio.vercel.app'
```

---

## 🐛 Troubleshooting

### Error: "Turso credentials not configured"

**Causa:** Variables de entorno no configuradas en Vercel

**Solución:**
1. Ir a Vercel Dashboard → Tu Proyecto → Settings → Environment Variables
2. Añadir `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`
3. Redesplegar: `vercel --prod`

---

### Error: "Failed to fetch"

**Causa:** La API no está respondiendo

**Solución:**
1. Verificar que el despliegue terminó correctamente
2. Revisar logs en Vercel Dashboard → Deployments → [tu deploy] → Functions
3. Verificar que las variables de entorno están configuradas

---

### Error: "CORS policy"

**Causa:** Problema de CORS en desarrollo local

**Solución:**
Asegúrate de que `vite.config.js` tiene la configuración de proxy correcta (ya está configurado).

---

## 📊 Monitoreo

### Ver logs en tiempo real:
```bash
vercel logs --follow
```

### Ver logs de una función específica:
```bash
vercel logs --follow api/media/books/index.js
```

---

## 🔄 Actualizar Despliegue

Cada vez que hagas `git push` a la rama `main`, Vercel automáticamente:
1. Detecta el cambio
2. Ejecuta el build
3. Despliega la nueva versión

Para forzar un redespliegue sin cambios:
```bash
vercel --prod --force
```

---

## 📈 Próximos Pasos

Una vez desplegado y verificado:

1. ✅ Configurar dominio personalizado (opcional)
2. ✅ Configurar analytics de Vercel
3. ✅ Implementar autenticación (Fase 2)
4. ✅ Añadir operaciones CRUD (Fase 2)
5. ✅ Expandir a música y video (Fase 3)

---

## 🆘 Soporte

Si encuentras problemas:
1. Revisar logs de Vercel
2. Verificar variables de entorno
3. Probar endpoints con curl
4. Revisar DevTools del navegador

**Documentación oficial:**
- [Vercel Functions](https://vercel.com/docs/functions)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Turso HTTP API](https://docs.turso.tech/reference/client-access/http-api)
