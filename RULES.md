# Reglas del proyecto

## 1. Alcance

- **Dominio**: catálogo de contenidos (libros, discos, vídeo, etc.) sobre **BD relacional**.
- **Componentes**:
  - Backend/API (Node/Express o similar, despliegue tipo Vercel).
  - Webapp (React + Vite).
  - App escritorio (Python + UI).
  - BD: SQLite local + BD remota (Turso/PostgreSQL/etc.) con sincronización.

---

## 2. Datos y modelo de dominio

- **FKs e IDs como fuente de verdad**
  - Toda la lógica de negocio se basa en **IDs** y **claves foráneas**, nunca en slugs ni nombres.
  - Para tipos especiales (discoteca, videoteca, etc.):
    - Resolver sus IDs una única vez (por configuración o lookup) y usar esos IDs en todo el código.
- **Slugs y nombres**
  - Uso exclusivo para:
    - URLs legibles.
    - Etiquetas visibles en UI.
  - Prohibido usarlos como clave de seguridad, permisos o lógica crítica.
- **Integridad referencial**
  - Borrados:
    - Primero tablas hijas (por FK), luego tabla padre.
    - O `ON DELETE CASCADE` explícito, documentado y testeado.
  - Todas las tablas sincronizadas deben tener:
    - `created` (datetime)
    - `updated` (datetime)

---

## 3. Seguridad (usuarios y datos)

- **Autenticación**
  - JWT o sesiones con cookies HttpOnly; nunca exponer tokens sensibles al frontend.
  - Separar roles:
    - Usuario normal (lectura).
    - Staff/admin (altas, ediciones, borrados).
- **Autorización**
  - Permisos se validan siempre en el **backend**.
  - Endpoints de escritura requieren rol adecuado; el frontend no es fuente de verdad.
- **Contraseñas**
  - Hash seguro (bcrypt/argon2/scrypt).
  - Nunca guardar contraseñas en claro ni enviarlas por correo.
- **Saneado de entrada**
  - Validar todos los datos externos (body, query, headers).
  - Usar consultas SQL parametrizadas; prohibido concatenar strings para SQL.
- **Exposición de datos**
  - No devolver campos sensibles en JSON (password, tokens, secretos).
  - Mensajes de error amigables; detalles técnicos solo en logs de servidor.

---

## 4. Backend / API

- **Lenguaje y estilo**
  - JavaScript moderno (ESM) o TypeScript.
  - ESLint + Prettier activados.
- **Arquitectura**
  - Separar:
    - Rutas/controladores.
    - Servicios (lógica de negocio).
    - Acceso a datos (repositorios/queries).
- **Consultas SQL**
  - Centralizar en módulos de queries (`QUERIES`).
  - Nombrar claramente (`GET_BOOK_BY_ID`, `GET_TEMAS_BY_TITULO_ID`, etc.).
- **Errores**
  - Usar `try/catch` en endpoints.
  - Responder con:
    - `4xx` para errores de cliente (validación, permisos).
    - `5xx` para errores de servidor.
  - Logear errores con contexto mínimo (ruta, usuario, mensaje).

---

## 5. Sincronización local ↔ remota

- **Configuración explícita**
  - Todas las tablas sincronizadas aparecen en una configuración única:
    - `id_field`
    - `fields`
    - `updated_field`
- **Orden de sync**
  - Inserts/updates: padres → hijos.
  - Deletes: hijos → padres.
- **Estrategia**
  - Last‑Write‑Wins usando `updated`.
  - Pendientes:
    - `pending_pushes` para altas/modificaciones locales.
    - `pending_deletes` para borrados locales.

---

## 6. Frontend (React + Vite)

- **Estructura**
  - Componentes de UI puros + servicios de datos (`services/...`).
  - Nada de llamadas directas a BD desde React.
- **Diseño**
  - Tema coherente (p.ej. fondo oscuro en todos los modales si se usa en uno).
  - Campos importantes (`Título`, `Título original`, URLs) siempre `width: 100%`.
- **Accesibilidad**
  - Iconos que sustituyen texto deben tener `aria-label`.
  - Formularios con `label` correctamente asociado (`htmlFor` / `id`).

---

## 7. App de escritorio (Python + UI)

- **Capas**
  - UI (ventanas/dialogos).
  - Acceso a datos (`database.py`).
  - Sincronización (`SyncManager`).
- **Sync**
  - No acceder a Turso directamente desde widgets:
    - Siempre a través del `SyncManager` o una API dedicada.
  - Cualquier alta/edición registrada en tablas sincronizadas:
    - Actualiza `created`/`updated`.
    - Usa `pending_pushes`/`pending_deletes` si no hay conexión.

---

## 8. Testing y despliegue

- **Antes de cada deploy**
  - `npm run build` sin errores.
  - Pruebas manuales mínimas:
    - Alta/edición/borrado de libro.
    - Alta/edición/borrado de disco con temas (verificando FKs).
- **Logs**
  - Mantener logs de:
    - Errores de API.
    - Fallos de sync.
    - Reintentos de login fallidos repetidos.

---

## 9. Fuentes de información recomendadas

- **Lenguajes y frameworks**
  - MDN para JS/DOM/Web APIs.
  - Documentación oficial de React y Vite.
  - Documentación oficial de la BD utilizada (SQLite, Turso, PostgreSQL).
- **Seguridad**
  - OWASP (Top 10, Cheat Sheets).
- **Estilo**
  - Guía Airbnb para JS/TS.
  - PEP 8 para Python.

---

## 10. Metodología con asistentes/IA

- Preferir siempre:
  - **IDs/FKs sobre slugs** para lógica de negocio.
  - Cambios pequeños y localizados, con referencia exacta de archivos/secciones.
- Verificar siempre:
  - Build local > commit > deploy > comprobación visual.
- Si algo “no se ve” en la web:
  - Confirmar primero que el cambio está en el fichero correcto y compilado.
  - Solo entonces proponer una nueva modificación.

