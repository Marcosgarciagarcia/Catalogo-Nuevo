# Guía de Despliegue en Vercel

## 📋 Requisitos Previos

- ✅ Cuenta de Vercel (https://vercel.com)
- ✅ Repositorio Git con el proyecto
- ✅ Credenciales de Turso Database

---

## 🚀 Pasos para Desplegar

### 1. Preparar el Repositorio Git

**Asegúrate de que todos los cambios estén commiteados:**

```bash
cd C:\Cursos\UOC\Proyecto_Final\Catalogo-Frontend-Turso

# Ver estado
git status

# Añadir archivos modificados
git add .

# Commit
git commit -m "Preparar proyecto para despliegue en Vercel"

# Push a GitHub
git push origin main
```

### 2. Conectar Proyecto a Vercel

#### Opción A: Desde el Dashboard de Vercel

1. Ve a https://vercel.com/dashboard
2. Haz clic en **"Add New..."** → **"Project"**
3. Selecciona tu repositorio de GitHub: `Catalogo-Nuevo` o el repositorio donde esté este proyecto
4. Vercel detectará automáticamente que es un proyecto **Vite**

#### Configuración del Proyecto:

**Framework Preset:** Vite  
**Root Directory:** `./` (o la carpeta específica si está en subdirectorio)  
**Build Command:** `npm run build` (ya configurado)  
**Output Directory:** `dist` (por defecto de Vite)  
**Install Command:** `npm install`

### 3. Configurar Variables de Entorno

**IMPORTANTE:** Antes de hacer el deploy, configura las variables de entorno.

En el dashboard de Vercel, antes de hacer clic en "Deploy":

1. Expande **"Environment Variables"**
2. Añade las siguientes variables:

| Name | Value |
|------|-------|
| `VITE_TURSO_DATABASE_URL` | `https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io` |
| `VITE_TURSO_AUTH_TOKEN` | `eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA` |

**Environments:** Marca todas (Production, Preview, Development)

### 4. Desplegar

Haz clic en **"Deploy"**

Vercel:
- ✅ Clonará el repositorio
- ✅ Instalará dependencias (`npm install`)
- ✅ Ejecutará el build (`npm run build`)
- ✅ Desplegará el sitio

**Tiempo estimado:** 1-2 minutos

### 5. Verificar Despliegue

Una vez completado, Vercel te proporcionará:
- **URL de producción:** `https://tu-proyecto.vercel.app`
- **URL de preview:** Para cada commit/PR

**Prueba que funcione:**
1. Abre la URL
2. Verifica que cargue el catálogo de libros
3. Prueba la búsqueda
4. Verifica que las imágenes de Cloudinary se carguen

---

## 🔄 Despliegues Automáticos

### Configuración Automática

Vercel ahora está conectado a tu repositorio Git:

**Cada vez que hagas `git push`:**
- ✅ Se desplegará automáticamente a **Preview** (ramas no-main)
- ✅ Se desplegará automáticamente a **Production** (rama main)

### Workflow Recomendado

```bash
# 1. Hacer cambios en el código
# 2. Probar localmente
npm run dev

# 3. Commit y push
git add .
git commit -m "Descripción de cambios"
git push origin main

# 4. Vercel despliega automáticamente
# 5. Verifica en la URL de producción
```

---

## ⚙️ Configuración Avanzada

### Dominios Personalizados

1. Ve a tu proyecto en Vercel
2. **Settings** → **Domains**
3. Añade tu dominio personalizado
4. Sigue las instrucciones de DNS

### Variables de Entorno Adicionales

Si necesitas añadir más variables:

1. **Settings** → **Environment Variables**
2. Añade la variable
3. Redeploy el proyecto

### Build & Development Settings

**Si necesitas cambiar la configuración:**

1. **Settings** → **General**
2. Modifica:
   - Build Command
   - Output Directory
   - Install Command
   - Root Directory

---

## 🐛 Solución de Problemas

### Error: "Build Failed"

**Causa común:** Errores de ESLint o TypeScript

**Solución:**
```bash
# Ejecuta el build localmente primero
npm run build

# Si hay errores, corrígelos antes de hacer push
```

### Error: "Cannot connect to Turso"

**Verifica:**
1. Variables de entorno configuradas correctamente
2. Token de Turso no expirado
3. URL de Turso correcta

**Logs:**
- Ve a **Deployments** → Selecciona el deployment → **View Function Logs**

### Error: "404 on page refresh"

**Causa:** Problema con SPA routing

**Solución:** Ya está configurado en `vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Imágenes no cargan

**Verifica:**
1. URLs de Cloudinary correctas en la BD
2. Campo `portada_cloudinary` tiene valores
3. No hay errores CORS (Cloudinary debe permitir tu dominio)

---

## 📊 Monitoreo

### Analytics

Vercel proporciona analytics automáticos:
- **Visits:** Número de visitas
- **Page Views:** Páginas vistas
- **Performance:** Web Vitals

**Acceso:**
- Dashboard → Tu Proyecto → **Analytics**

### Logs

**Ver logs en tiempo real:**
1. Dashboard → Tu Proyecto → **Deployments**
2. Selecciona un deployment
3. **View Function Logs** o **Build Logs**

---

## 🔒 Seguridad

### Variables de Entorno

**IMPORTANTE:**
- ✅ Las variables `VITE_*` son **públicas** (se incluyen en el bundle)
- ✅ El token de Turso está configurado para **solo lectura** desde el frontend
- ❌ **NO** incluyas tokens con permisos de escritura en variables `VITE_*`

### Recomendaciones

1. **Token de solo lectura:** Usa un token de Turso con permisos limitados
2. **Rate limiting:** Configura en Turso si es necesario
3. **CORS:** Verifica configuración de Cloudinary

---

## 📝 Checklist de Despliegue

Antes de desplegar, verifica:

- [ ] Todos los cambios están commiteados
- [ ] El proyecto se construye sin errores (`npm run build`)
- [ ] Variables de entorno configuradas en Vercel
- [ ] `vercel.json` está actualizado
- [ ] `.env.example` tiene las variables correctas
- [ ] `.gitignore` incluye `.env.local`
- [ ] Repositorio está actualizado en GitHub

---

## 🔗 Enlaces Útiles

- **Dashboard de Vercel:** https://vercel.com/dashboard
- **Documentación de Vercel:** https://vercel.com/docs
- **Turso Dashboard:** https://app.turso.tech
- **Cloudinary:** https://cloudinary.com/console

---

## 📞 Soporte

**Si tienes problemas:**

1. Revisa los logs en Vercel
2. Verifica las variables de entorno
3. Prueba el build localmente
4. Consulta la documentación de Vercel

---

**Última Actualización:** 29 de enero de 2026
