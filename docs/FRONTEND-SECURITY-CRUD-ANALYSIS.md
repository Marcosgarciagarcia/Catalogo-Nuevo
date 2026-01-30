# Análisis de Seguridad y CRUD para Frontend

**Fecha:** 30 de enero de 2026  
**Proyecto:** Catálogo de Libros - Frontend React + Turso

---

## 📋 Tarea 2: Seguridad en el Frontend

### **Estado Actual del Frontend**

**Arquitectura:**
- React + Vite
- Conexión directa a Turso Database (HTTP API)
- Token de autenticación hardcodeado en `tursoService.js`
- Sin autenticación de usuarios
- Solo operaciones de lectura (GET)

**Problema de Seguridad Crítico:**
```javascript
// tursoService.js - Línea 7
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...';
```
⚠️ **Token con permisos READ/WRITE expuesto en el cliente**

---

### **Estrategia de Seguridad Recomendada**

#### **Opción 1: Backend Intermedio (RECOMENDADA)**

**Arquitectura:**
```
[Frontend React] → [Backend API] → [Turso Database]
                    (Node.js/Express)
                    - Autenticación JWT
                    - Validación
                    - Rate limiting
```

**Ventajas:**
- ✅ Token de Turso nunca expuesto al cliente
- ✅ Control total sobre operaciones permitidas
- ✅ Autenticación y autorización robusta
- ✅ Validación de datos en servidor
- ✅ Rate limiting y protección contra abusos

**Implementación:**
1. Crear API REST con Express.js
2. Implementar autenticación con JWT o sesiones
3. Proxy de consultas a Turso desde el backend
4. Variables de entorno para credenciales sensibles

**Tecnologías:**
- Express.js o Fastify (Node.js)
- Passport.js o JWT para autenticación
- bcrypt para hash de contraseñas
- express-rate-limit para protección

---

#### **Opción 2: Turso Edge Functions (ALTERNATIVA)**

**Arquitectura:**
```
[Frontend React] → [Turso Edge Functions] → [Turso Database]
                    - Autenticación integrada
                    - Lógica de negocio
```

**Ventajas:**
- ✅ Serverless, sin infraestructura adicional
- ✅ Integración nativa con Turso
- ✅ Escalabilidad automática

**Desventajas:**
- ⚠️ Menos control sobre la lógica
- ⚠️ Dependencia de la plataforma Turso

---

#### **Opción 3: Vercel Serverless Functions**

**Arquitectura:**
```
[Frontend React] → [Vercel API Routes] → [Turso Database]
                    - Serverless
                    - Edge runtime
```

**Ventajas:**
- ✅ Integración perfecta con despliegue en Vercel
- ✅ Sin servidor adicional que mantener
- ✅ Variables de entorno seguras

**Implementación:**
```
/api
  /books
    GET.js      - Listar libros
    [id].js     - Detalle de libro
  /auth
    login.js    - Autenticación
```

---

### **Sistema de Autenticación Propuesto**

#### **Modelo de Usuarios:**

**Tabla: `core_usuarios`**
```sql
CREATE TABLE core_usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol TEXT DEFAULT 'viewer',  -- viewer, editor, admin
  created DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  ultimo_acceso DATETIME
);
```

**Roles:**
- **viewer**: Solo lectura (público)
- **editor**: Crear/editar libros, autores, editoriales
- **admin**: Todas las operaciones + gestión de usuarios

---

#### **Flujo de Autenticación:**

1. **Login:**
   ```
   POST /api/auth/login
   Body: { username, password }
   Response: { token, user: { id, username, rol } }
   ```

2. **Validación:**
   ```
   Middleware verifica JWT en cada request
   Extrae rol del usuario
   Autoriza operación según permisos
   ```

3. **Refresh Token:**
   ```
   POST /api/auth/refresh
   Headers: { Authorization: Bearer <refresh_token> }
   Response: { token }
   ```

---

### **Implementación en Frontend**

#### **Context de Autenticación:**

```javascript
// src/contexts/AuthContext.jsx
import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar token en localStorage al cargar
    const token = localStorage.getItem('token');
    if (token) {
      // Validar token con backend
      validateToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    localStorage.setItem('token', data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

#### **Protected Routes:**

```javascript
// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (requiredRole && user.rol !== requiredRole && user.rol !== 'admin') {
    return <Navigate to="/" />;
  }

  return children;
}
```

---

## 📋 Tarea 3: Operaciones CRUD en Frontend

### **Análisis de Funcionalidades Necesarias**

#### **Estado Actual:**
- ✅ **READ**: Listar, buscar, filtrar libros
- ❌ **CREATE**: No implementado
- ❌ **UPDATE**: No implementado
- ❌ **DELETE**: No implementado

---

### **Operaciones CRUD Propuestas**

#### **1. Gestión de Libros**

**CREATE - Añadir Libro:**
```javascript
// POST /api/books
{
  EAN: "9788420412146",
  titulo: "Cien años de soledad",
  tituloOriginal: "Cien años de soledad",
  codiAutor_id: 123,
  codiEditorial_id: 45,
  anyoEdicion: "1967",
  numeroPaginas: 471,
  numeroEdicion: 1,
  numeroEjemplares: 1,
  coleccion: "Biblioteca García Márquez",
  serie: null,
  sinopsis: "...",
  observaciones: null,
  portada_cloudinary: "https://..."
}
```

**UPDATE - Editar Libro:**
```javascript
// PUT /api/books/:id
{
  titulo: "Cien años de soledad (Edición conmemorativa)",
  numeroPaginas: 496,
  // ... campos a actualizar
}
```

**DELETE - Eliminar Libro:**
```javascript
// DELETE /api/books/:id
// Soft delete: marcar como eliminado en lugar de borrar
```

---

#### **2. Gestión de Autores**

**CREATE - Añadir Autor:**
```javascript
// POST /api/authors
{
  nombreAutor: "Gabriel García Márquez",
  enlaceWiki: "https://es.wikipedia.org/wiki/Gabriel_García_Márquez",
  enlaceWiki2: null
}
```

**UPDATE - Editar Autor:**
```javascript
// PUT /api/authors/:id
{
  nombreAutor: "Gabriel García Márquez",
  enlaceWiki: "https://...",
  enlaceWiki2: "https://..."
}
```

**LIST - Listar Autores:**
```javascript
// GET /api/authors
// GET /api/authors?search=garcia
```

---

#### **3. Gestión de Editoriales**

**CREATE - Añadir Editorial:**
```javascript
// POST /api/publishers
{
  descriEditorial: "Editorial Sudamericana"
}
```

**UPDATE - Editar Editorial:**
```javascript
// PUT /api/publishers/:id
{
  descriEditorial: "Editorial Sudamericana S.A."
}
```

**LIST - Listar Editoriales:**
```javascript
// GET /api/publishers
```

---

### **Componentes UI Necesarios**

#### **1. Formulario de Libro:**

```javascript
// src/components/BookForm.jsx
- Campo: Título (requerido)
- Campo: Título original
- Campo: EAN/ISBN
- Select: Autor (con búsqueda)
- Select: Editorial (con búsqueda)
- Campo: Año de edición
- Campo: Número de páginas
- Campo: Número de ejemplares
- Campo: Colección
- Campo: Serie
- TextArea: Sinopsis
- TextArea: Observaciones
- Upload: Portada (Cloudinary)
- Botones: Guardar, Cancelar
```

#### **2. Modal de Confirmación:**

```javascript
// src/components/ConfirmDialog.jsx
- Título: "¿Eliminar libro?"
- Mensaje: "Esta acción no se puede deshacer"
- Botones: Confirmar, Cancelar
```

#### **3. Selector de Autor/Editorial:**

```javascript
// src/components/AutocompleteSelect.jsx
- Input con búsqueda
- Lista desplegable de resultados
- Opción: "Crear nuevo..."
```

---

### **Rutas Propuestas para el Frontend**

```javascript
// src/App.jsx con React Router
<Routes>
  {/* Públicas */}
  <Route path="/" element={<Home />} />
  <Route path="/login" element={<Login />} />
  <Route path="/books/:id" element={<BookDetail />} />
  
  {/* Protegidas - Editor */}
  <Route path="/books/new" element={
    <ProtectedRoute requiredRole="editor">
      <BookForm />
    </ProtectedRoute>
  } />
  
  <Route path="/books/:id/edit" element={
    <ProtectedRoute requiredRole="editor">
      <BookForm />
    </ProtectedRoute>
  } />
  
  <Route path="/authors" element={
    <ProtectedRoute requiredRole="editor">
      <AuthorsList />
    </ProtectedRoute>
  } />
  
  <Route path="/publishers" element={
    <ProtectedRoute requiredRole="editor">
      <PublishersList />
    </ProtectedRoute>
  } />
  
  {/* Protegidas - Admin */}
  <Route path="/admin/users" element={
    <ProtectedRoute requiredRole="admin">
      <UserManagement />
    </ProtectedRoute>
  } />
</Routes>
```

---

### **API Endpoints Completos**

#### **Libros:**
- `GET /api/books` - Listar todos
- `GET /api/books/:id` - Detalle
- `POST /api/books` - Crear (requiere: editor)
- `PUT /api/books/:id` - Actualizar (requiere: editor)
- `DELETE /api/books/:id` - Eliminar (requiere: admin)

#### **Autores:**
- `GET /api/authors` - Listar todos
- `GET /api/authors/:id` - Detalle
- `POST /api/authors` - Crear (requiere: editor)
- `PUT /api/authors/:id` - Actualizar (requiere: editor)
- `DELETE /api/authors/:id` - Eliminar (requiere: admin)

#### **Editoriales:**
- `GET /api/publishers` - Listar todas
- `GET /api/publishers/:id` - Detalle
- `POST /api/publishers` - Crear (requiere: editor)
- `PUT /api/publishers/:id` - Actualizar (requiere: editor)
- `DELETE /api/publishers/:id` - Eliminar (requiere: admin)

#### **Autenticación:**
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Usuario actual

#### **Admin:**
- `GET /api/admin/users` - Listar usuarios (requiere: admin)
- `POST /api/admin/users` - Crear usuario (requiere: admin)
- `PUT /api/admin/users/:id` - Actualizar usuario (requiere: admin)
- `DELETE /api/admin/users/:id` - Eliminar usuario (requiere: admin)

---

## 🎯 Recomendaciones Finales

### **Prioridad Alta:**
1. ✅ **Implementar backend API** (Express.js o Vercel Functions)
2. ✅ **Mover token de Turso al backend**
3. ✅ **Sistema de autenticación básico** (JWT)
4. ✅ **Proteger todas las operaciones de escritura**

### **Prioridad Media:**
1. 📝 **Formularios de creación/edición** de libros
2. 📝 **Gestión de autores y editoriales**
3. 📝 **Validación de datos** en cliente y servidor

### **Prioridad Baja:**
1. 🔄 **Gestión de usuarios** (admin panel)
2. 🔄 **Logs de auditoría**
3. 🔄 **Notificaciones en tiempo real**

---

## 📦 Dependencias Necesarias

### **Backend (Express.js):**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "dotenv": "^16.3.1",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0"
  }
}
```

### **Frontend (React):**
```json
{
  "dependencies": {
    "react-router-dom": "^6.21.1",
    "axios": "^1.6.5"
  }
}
```

---

## 🚀 Plan de Implementación

### **Fase 1: Seguridad (1-2 días)**
1. Crear backend API con Express.js
2. Mover lógica de Turso al backend
3. Implementar autenticación JWT
4. Actualizar frontend para usar API

### **Fase 2: CRUD Básico (2-3 días)**
1. Endpoints de creación/edición de libros
2. Formulario de libro en frontend
3. Validación de datos

### **Fase 3: Gestión Completa (2-3 días)**
1. CRUD de autores y editoriales
2. Componentes de gestión en frontend
3. Búsqueda y filtros avanzados

### **Fase 4: Administración (1-2 días)**
1. Panel de administración
2. Gestión de usuarios
3. Logs y auditoría

---

**Total estimado: 6-10 días de desarrollo**
