# Configuración de la API y autenticación

## Variables de entorno (Vercel)

En **Vercel → Project → Settings → Environment Variables** configura:

- `TURSO_DATABASE_URL`: URL de tu base Turso (ej. `https://xxx.turso.io`)
- `TURSO_AUTH_TOKEN`: Token de Turso con permisos de lectura/escritura (solo en el servidor)
- `JWT_SECRET`: Una clave secreta larga y aleatoria para firmar los JWT (solo en el servidor)

Ninguna de estas variables debe tener el prefijo `VITE_` (no deben exponerse al frontend).

## Tabla de usuarios (Turso)

El login (`POST /api/auth/login`) espera una tabla `core_users` en Turso. Si no existe, créala y añade al menos un usuario.

### Crear la tabla

```sql
CREATE TABLE IF NOT EXISTS core_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  is_staff INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0
);
```

### Crear un usuario (ejemplo)

El campo `password_hash` debe ser un hash **bcrypt** de la contraseña (cost 10). Puedes generarlo con Node:

```js
// script temporal: node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('tu_contraseña', 10));"
```

Luego en Turso (o con un script que use la API de Turso):

```sql
INSERT INTO core_users (username, password_hash, email, is_staff, is_admin)
VALUES ('admin', '<hash_generado>', 'admin@ejemplo.com', 1, 1);
```

## Desarrollo local

- Para probar frontend y API juntos: `npx vercel dev` (sirve el frontend y las rutas `/api/*`).
- Si solo ejecutas `npm run dev` (Vite), las llamadas a `/api/*` irán al mismo origen; si usas un proxy o la API en otro puerto, define `VITE_API_BASE_URL` en `.env.local`.
