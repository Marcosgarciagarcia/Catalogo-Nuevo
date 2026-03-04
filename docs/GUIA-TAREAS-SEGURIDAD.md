# Guía: tareas que debes hacer tú (seguridad y login)

Sigue estos pasos en orden. Al final tendrás la API funcionando con login y sin exponer credenciales.

---

## Tarea 1: Variables de entorno en Vercel

1. Entra en [vercel.com](https://vercel.com) → tu proyecto **Catalogo**.
2. Ve a **Settings** → **Environment Variables**.
3. Añade estas variables (usa **Production**, **Preview** y **Development** si quieres que funcione en todos los entornos):

   | Nombre | Valor | Notas |
   |--------|--------|--------|
   | `TURSO_DATABASE_URL` | `https://tu-instancia.turso.io` | La URL de tu base Turso (la que ya usabas en la app de escritorio). |
   | `TURSO_AUTH_TOKEN` | Token que te da Turso | Token de lectura/escritura. Lo obtienes en el dashboard de Turso o con `turso db tokens create`. |
   | `JWT_SECRET` | Una clave larga y aleatoria | Ejemplo: genera una con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` y copia el resultado. |

4. Guarda los cambios. En el próximo despliegue, la API usará estas variables.

**Importante:** No uses el prefijo `VITE_` en ninguna de estas variables (solo para el backend).

---

## Tarea 2: Tabla de usuarios y primer usuario en Turso

Tienes dos opciones.

### Opción A: Script automático (recomendado)

En la raíz del proyecto, con **Node 18 o superior** y un archivo **`.env.local`** que contenga al menos:

```env
TURSO_DATABASE_URL=https://tu-instancia.turso.io
TURSO_AUTH_TOKEN=tu_token_turso
```

Crea `.env.local` copiando `.env.example` y rellenando esos dos valores (y `JWT_SECRET` si quieres probar la API en local).

Luego, desde la **raíz del proyecto**, ejecuta:

```bash
node scripts/setup-core-users.js crear
```

(O bien: `npm run setup-users crear`.)

El script lee `.env.local` y crea la tabla `core_users` si no existe. Te pedirá **usuario**, **contraseña** y **email** (opcional) y creará el primer usuario como admin (is_staff=1, is_admin=1).

Para no escribir a mano, puedes pasar los datos por parámetros:

```bash
node scripts/setup-core-users.js crear admin miPassword admin@ejemplo.com
```

Para añadir más usuarios más adelante (sin permisos de admin):

```bash
node scripts/setup-core-users.js añadir
```

### Opción B: Manual (SQL en Turso)

1. En el [dashboard de Turso](https://turso.tech) abre tu base de datos y entra en la pestaña **SQL** (o usa `turso db shell nombre-db`).
2. Ejecuta este SQL para crear la tabla:

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

3. Genera el hash de la contraseña en tu máquina (en la raíz del proyecto):

```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('TU_CONTRASEÑA_AQUI', 10));"
```

4. Copia el hash y ejecuta en Turso (sustituye `<HASH>` y el email si quieres):

```sql
INSERT INTO core_users (username, password_hash, email, is_staff, is_admin)
VALUES ('admin', '<HASH>', 'admin@ejemplo.com', 1, 1);
```

---

## Tarea 3: Probar en local (frontend + API)

1. Asegúrate de tener **`.env.local`** en la raíz con al menos:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `JWT_SECRET`

2. (Opcional) Instala Vercel CLI globalmente: `npm i -g vercel`

3. En la raíz del proyecto ejecuta:

```bash
npx vercel dev
```

(O bien: `npm run dev:full`.)

4. Abre la URL que te indique (suele ser `http://localhost:3000`). Verás el frontend y las rutas `/api/*` funcionando.

5. Prueba el login: en tablet/escritorio debería aparecer "Iniciar sesión"; usa el usuario y contraseña que creaste en la Tarea 2.

---

## Resumen rápido

| Tarea | Qué hacer |
|-------|-----------|
| 1. Vercel | Añadir `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET` en Settings → Environment Variables. |
| 2. Turso | Crear tabla `core_users` y al menos un usuario (script `scripts/setup-core-users.js` o SQL manual). |
| 3. Local | Crear `.env.local` con las mismas variables y ejecutar `npx vercel dev` para probar. |

Si algo falla, revisa `docs/API-AUTH-SETUP.md` y que las variables no tengan espacios ni comillas de más en Vercel.

---

## Si en el PC no cargan los libros o falla el login

### Si abres la URL de Vercel (p. ej. https://catalogo-nuevo-yngn.vercel.app)

Entonces el frontend y la API están en el mismo sitio. Si aun así en el PC no cargan los libros o el login da error, suele ser que **la API en Vercel está fallando** (variables de entorno o error en la función).

**Comprobaciones en el PC:**

1. **Probar que la API responde y tiene las variables:**  
   Abre en el navegador:  
   **https://catalogo-nuevo-yngn.vercel.app/api/health**  
   Deberías ver algo como:  
   `{"ok":true,"api":"catalogo","env":{"turso":"set","jwt":"set"}}`  
   - Si ves `"turso":"missing"` o `"jwt":"missing"`: en **Vercel → tu proyecto → Settings → Environment Variables** añade (o corrige) **TURSO_DATABASE_URL**, **TURSO_AUTH_TOKEN** y **JWT_SECRET** para el entorno **Production**. Vuelve a desplegar.
   - Si esa URL no carga o da error de página: revisa en **Vercel → Deployments → última deployment → Functions** si hay errores en las funciones.

2. **Probar la ruta de libros:**  
   Abre:  
   **https://catalogo-nuevo-yngn.vercel.app/api/media/books**  
   Deberías ver JSON con una lista de libros. Si ves HTML de error o página en blanco, en Vercel revisa los **logs de la función** de esa ruta.

3. **Después de cambiar variables en Vercel** hay que hacer un nuevo despliegue (o “Redeploy” del último) para que las funciones usen los nuevos valores.

### Si en el PC abres la app en local (localhost)

En ese caso **no hay API** si solo usas `npm run dev`. Opciones:

1. **Opción A:** Usar en el PC la **misma URL de Vercel** que en tablet/móvil.
2. **Opción B:** Probar en local con **`npx vercel dev`** (o `npm run dev:full`) y abrir la URL que indique (p. ej. `http://localhost:3000`).
