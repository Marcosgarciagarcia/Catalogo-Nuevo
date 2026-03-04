# Análisis de seguridad – Parte web (Catálogo)

## Resumen ejecutivo

La parte web tiene **riesgos graves** por exponer credenciales de base de datos en el frontend y por conectar el navegador directamente a Turso. Cualquier usuario que abra la aplicación (o inspeccione el código/red) puede obtener el token y **ejecutar cualquier consulta sobre la base de datos**, incluido modificar o borrar datos. Se recomienda actuar de inmediato sobre los puntos críticos.

---

## 1. Riesgos críticos

### 1.1 Token de Turso expuesto en el frontend

**Ubicación:** `src/services/tursoService.js` (líneas 6-7)

- La URL de Turso y, sobre todo, el **token de autenticación** (`VITE_TURSO_AUTH_TOKEN`) se usan en código que se ejecuta en el navegador.
- Hay un **token por defecto hardcodeado** cuando la variable de entorno no está definida:
  ```js
  const TURSO_TOKEN = import.meta.env.VITE_TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...';
  ```
- Las variables `VITE_*` se incluyen en el bundle del cliente al hacer `npm run build`. **Cualquier valor que pongas en `VITE_TURSO_AUTH_TOKEN` será visible** en el JavaScript que se descarga el usuario (DevTools → Sources / Network).
- Ese token es de **lectura/escritura** (`"a":"rw"` en el JWT). Con él, desde fuera de la app (por ejemplo con `curl` o Postman contra la API HTTP de Turso) se puede ejecutar **cualquier SQL**: SELECT, INSERT, UPDATE, DELETE, DROP, etc.

**Consecuencia:** Cualquier persona que acceda a la web (o al repo si el token sigue en el código) puede **editar la base de datos sin permiso**: borrar o modificar libros, autores, editoriales, etc.

**Recomendación:**  
- **Nunca** poner el token de Turso (ni de lectura/escritura ni de solo lectura) en el frontend.  
- Eliminar el token hardcodeado y no usar `VITE_TURSO_*` para credenciales.  
- Que el frontend **solo hable con tu API** (Vercel/serverless). La API, en el servidor, debe ser la única que use `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` (variables sin prefijo `VITE_`).

---

### 1.2 Conexión directa navegador → Turso

- El flujo actual es: **navegador → Turso** (con el token en el cliente).
- Aunque el frontend solo use consultas de lectura (getAllBooks, searchBooks, etc.), el **token expuesto** permite a quien lo copie hacer escrituras desde fuera de la app.

**Recomendación:**  
- Arquitectura objetivo: **navegador → API (Vercel) → Turso**.  
- El frontend solo llama a rutas como `/api/media/books`, `/api/media/authors`, etc.  
- Las credenciales de Turso solo en el backend (variables de entorno de Vercel, sin `VITE_`).

---

### 1.3 Endpoint de login inexistente

- `AuthContext.jsx` llama a `POST /api/auth/login` para iniciar sesión.
- En el proyecto solo existe **`api/auth/verify.js`**. No hay `api/auth/login.js` (ni lógica equivalente en otra ruta).
- El login **fallará siempre** (404) aunque la intención sea “solo lectura sin login y edición con login”.

**Recomendación:**  
- Implementar `api/auth/login.js` que valide usuario/contraseña (por ejemplo contra una tabla de usuarios en Turso o un servicio de auth), firme un JWT con un `JWT_SECRET` solo en servidor y devuelva el token al cliente.  
- Mantener `api/auth/verify.js` para que el frontend compruebe si la sesión sigue siendo válida.

---

## 2. Riesgos medios

### 2.1 API sin autenticación en rutas de datos

- Los endpoints en `api/media/` (books, authors, publishers) **no comprueban JWT** en el código actual. Cualquier persona que conozca la URL puede pedir listados y detalle.
- Si en el futuro añades escrituras (crear/editar/borrar) en esa API, deben estar **protegidas** (por ejemplo, exigir `authenticateRequest(req)` y comprobar `isStaff` o `isAdmin`).

**Recomendación:**  
- Para lectura pública: dejar los GET de `api/media/*` sin auth si quieres catálogo abierto.  
- Para cualquier escritura: comprobar token y rol en el servidor y devolver 401/403 si no tiene permiso.

### 2.2 Dependencias de la API no presentes en el repo

- `api/auth/verify.js` importa `../lib/auth.js` (por ejemplo `authenticateRequest`).
- `api/media/*` importan `../../lib/turso.js` (por ejemplo `executeQuery`).
- Esos archivos **no están** en la carpeta `api` del proyecto. En despliegue (p. ej. Vercel) la API fallará hasta que existan.

**Recomendación:**  
- Añadir `api/lib/auth.js` (validación JWT con `JWT_SECRET`) y `api/lib/turso.js` (cliente Turso usando `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` solo de entorno de servidor).

### 2.3 Variables de entorno y .gitignore

- `.gitignore` incluye `*.local`, por lo que `.env.local` no se sube (bien).
- No hay una regla explícita para `.env`. Si creas un `.env` con secretos y lo añades por error, podrían quedar en el repo.

**Recomendación:**  
- Añadir `.env` y `.env.*` (excepto `.env.example`) al `.gitignore`.  
- Dejar solo en el repo un `.env.example` sin valores reales (como ya tienes).

---

## 3. Aspectos positivos

- **Consultas parametrizadas:** En `tursoService.js` y en la API se usan parámetros (`?`) para búsquedas y filtros, lo que reduce el riesgo de inyección SQL en el código actual.
- **Token de sesión en sessionStorage:** El JWT de usuario se guarda en `sessionStorage` (no en `localStorage`), por lo que no persiste al cerrar el navegador.
- **CORS:** Los handlers de la API responden a OPTIONS, lo que permite configurar CORS correctamente.
- **Sin escrituras en el frontend:** El cliente solo tiene lecturas; no hay create/update/delete en la UI, lo que limita el daño mientras el token siga expuesto (el riesgo está en quien copia el token y usa la API de Turso por su cuenta).

---

## 4. Acciones prioritarias

| Prioridad | Acción |
|-----------|--------|
| **Alta**  | Eliminar el token hardcodeado de `src/services/tursoService.js` y no usar nunca `VITE_TURSO_AUTH_TOKEN` (ni ningún token) en el frontend. |
| **Alta**  | Cambiar el frontend para que **solo** consuma la API (`/api/media/books`, etc.) y no llame a Turso desde el navegador. Mover la lógica de Turso al backend. |
| **Alta**  | Crear `api/lib/turso.js` y `api/lib/auth.js` y configurar en Vercel las variables `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` y `JWT_SECRET`. |
| **Alta**  | Implementar `api/auth/login.js` para que el login funcione y la UI de “solo lectura sin login / edición con login” tenga sentido. |
| **Media** | Proteger con JWT (y roles) cualquier endpoint de la API que en el futuro permita crear, editar o borrar datos. |
| **Baja**  | Añadir `.env` al `.gitignore` y revisar que ningún secreto quede en el repositorio. |

---

## 5. Esquema objetivo (seguro)

```
[Navegador]
    │  Solo envía: peticiones a /api/* y (para login) usuario/contraseña.
    │  No tiene acceso a TURSO ni a JWT_SECRET.
    ▼
[API Vercel]
    │  api/auth/login   → valida usuario, devuelve JWT
    │  api/auth/verify  → valida JWT, devuelve user
    │  api/media/*      → usa TURSO_* solo aquí, ejecuta SQL
    ▼
[Turso]
```

Con este esquema, la base de datos solo es accesible desde el servidor; el usuario no puede editar la base de datos sin permiso más que a través de la lógica que tú implementes y protejas en la API.
