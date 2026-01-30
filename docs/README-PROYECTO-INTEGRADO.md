# Proyecto Final - Catálogo de Libros Integrado

## Visión General

Proyecto integrado de gestión de catálogo de libros con **tres componentes principales** que trabajan de forma coordinada:

1. **Aplicación de Escritorio** (Python + Tkinter)
2. **Backend/Base de Datos** (Turso Cloud + SQLite Local)
3. **Frontend Web** (React + Vite)

---

## Estructura del Proyecto

```
C:\Cursos\UOC\Proyecto_Final\
│
├── Catalogo/                          # Proyecto original (backup)
│
├── Catalogo-Nuevo/                    # Aplicación de escritorio + scripts
│   ├── catalogo_manager.py           # ⭐ App principal de escritorio
│   ├── migrate-full-db-to-turso.py   # Migración a Turso
│   ├── update-cloudinary-urls.py     # Actualización de imágenes
│   ├── README-CATALOGO-MANAGER.md    # Documentación del manager
│   └── TURSO-SETUP.md                # Setup de Turso
│
├── Catalogo-Frontend-Turso/          # Frontend web React
│   ├── src/
│   │   ├── services/
│   │   │   └── tursoService.js       # ⭐ Conexión a Turso
│   │   ├── components/
│   │   │   ├── BookList.jsx          # Lista de libros
│   │   │   └── Pagination.jsx        # Paginación
│   │   └── App.jsx                   # ⭐ Componente principal
│   ├── README-FRONTEND.md            # Documentación del frontend
│   └── test_frontend_turso.js        # Tests de conexión
│
├── HISTORIAL-CONVERSACION-29-ENE-2026.md  # Historial completo
└── README-PROYECTO-INTEGRADO.md           # Este archivo
```

---

## Componentes del Sistema

### 1. 🖥️ Aplicación de Escritorio

**Ubicación:** `Catalogo-Nuevo/catalogo_manager.py`

**Tecnologías:**
- Python 3.x
- Tkinter (GUI)
- sqlite3 (BD local)
- requests (API Turso)

**Funcionalidades:**
- ✅ CRUD completo de libros
- ✅ Sincronización bidireccional Local ↔ Turso
- ✅ Búsqueda avanzada
- ✅ Estadísticas en tiempo real
- ✅ Gestión de autores y editoriales

**Ejecutar:**
```bash
cd C:\Cursos\UOC\Proyecto_Final\Catalogo-Nuevo
python catalogo_manager.py
```

### 2. 🗄️ Backend / Base de Datos

**Arquitectura Dual:**

#### Base de Datos Local
- **Tipo:** SQLite
- **Ubicación:** `C:\ProyectosDjango\casateca\db.sqlite3`
- **Uso:** Desarrollo y backup local
- **Registros:** 2,722 libros, 1,457 autores, 580+ editoriales

#### Base de Datos Cloud (Turso)
- **Tipo:** libSQL (SQLite compatible)
- **URL:** `https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io`
- **Uso:** Producción y acceso web
- **Características:**
  - HTTP API directa
  - Sin necesidad de backend intermedio
  - Sincronización con local

**Tablas Principales:**
- `core_titulos` - 2,722 libros
- `core_autores` - 1,457 autores
- `core_editoriales` - 580+ editoriales
- 23 tablas adicionales (géneros, soportes, ubicaciones, etc.)

**Campo Especial:**
- `portada_cloudinary` - URLs completas de imágenes (2,566 libros)

### 3. 🌐 Frontend Web

**Ubicación:** `Catalogo-Frontend-Turso/`

**Tecnologías:**
- React 18.3.1
- Vite 6.0.3
- @libsql/client (cliente Turso)
- Cloudinary (imágenes)

**Funcionalidades:**
- ✅ Catálogo completo (2,722 libros)
- ✅ Búsqueda por título o autor
- ✅ Filtrado alfabético (A-Z, Ñ)
- ✅ Paginación (10 libros/página)
- ✅ Imágenes desde Cloudinary
- ✅ Responsive design

**Ejecutar:**
```bash
cd C:\Cursos\UOC\Proyecto_Final\Catalogo-Frontend-Turso
npm run dev
```

**URL:** http://localhost:5174

---

## Flujo de Datos

```
┌─────────────────────┐
│  SQLite Local       │
│  (db.sqlite3)       │
└──────────┬──────────┘
           │
           │ Sincronización
           │ (catalogo_manager.py)
           ▼
┌─────────────────────┐
│  Turso Cloud        │
│  (libSQL)           │
└──────────┬──────────┘
           │
           │ HTTP API
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌──────────┐
│ Desktop │  │ Frontend │
│  App    │  │   Web    │
└─────────┘  └──────────┘
```

---

## Sincronización de Datos

### Estrategia
- **Bidireccional:** Local ↔ Turso
- **Manual:** Ejecutada desde la app de escritorio
- **Inteligente:** Solo sincroniza cambios (por timestamp)

### Funciones de Sincronización

**En `catalogo_manager.py`:**
```python
sync_local_to_turso()      # Local → Turso
sync_turso_to_local()      # Turso → Local
sync_bidirectional()       # Ambas direcciones
```

### Orden de Sincronización
1. Autores
2. Editoriales
3. Libros (con dependencias resueltas)

---

## Gestión de Imágenes

### Cloudinary
- **URL Base:** `https://res.cloudinary.com/casateca/image/upload/v1/libros/`
- **Campo BD:** `portada_cloudinary` (URL completa)
- **Cobertura:** 2,566 de 2,722 libros (94.3%)

### Formato
```
https://res.cloudinary.com/casateca/image/upload/v1/libros/9788420412146.jpg
```

---

## Configuración

### Variables de Entorno

**Para Frontend (`Catalogo-Frontend-Turso/.env.local`):**
```env
VITE_TURSO_DATABASE_URL=https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io
VITE_TURSO_AUTH_TOKEN=eyJhbGci...
```

**Para Desktop App:**
Credenciales hardcodeadas en `catalogo_manager.py` (líneas 18-19)

---

## Comandos Rápidos

### Desarrollo

**Iniciar Frontend:**
```bash
cd C:\Cursos\UOC\Proyecto_Final\Catalogo-Frontend-Turso
npm run dev
```

**Iniciar Desktop App:**
```bash
cd C:\Cursos\UOC\Proyecto_Final\Catalogo-Nuevo
python catalogo_manager.py
```

**Probar Conexión Turso:**
```bash
cd C:\Cursos\UOC\Proyecto_Final\Catalogo-Frontend-Turso
node test_frontend_turso.js
```

### Sincronización

**Desde Desktop App:**
1. Abrir `catalogo_manager.py`
2. Ir a pestaña "🔄 Sincronización"
3. Elegir dirección:
   - ⬆️ Local → Turso
   - ⬇️ Turso → Local
   - 🔄 Bidireccional

---

## Estadísticas del Proyecto

### Base de Datos
- **Total de libros:** 2,722
- **Total de autores:** 1,457
- **Total de editoriales:** 580+
- **Libros con portada:** 2,566 (94.3%)
- **Tablas migradas:** 26
- **Registros totales:** 10,909

### Código
- **Archivos Python:** 15+
- **Componentes React:** 3
- **Servicios:** 1 (tursoService.js)
- **Líneas de código:** ~50,000+

---

## Documentación Disponible

### General
- `README-PROYECTO-INTEGRADO.md` - Este archivo
- `HISTORIAL-CONVERSACION-29-ENE-2026.md` - Historial completo de desarrollo

### Por Componente
- `Catalogo-Nuevo/README-CATALOGO-MANAGER.md` - App de escritorio
- `Catalogo-Nuevo/TURSO-SETUP.md` - Configuración de Turso
- `Catalogo-Frontend-Turso/README-FRONTEND.md` - Frontend web
- `Catalogo-Frontend-Turso/RESUMEN-SINCRONIZACION.md` - Sincronización BD

---

## Problemas Conocidos y Soluciones

### 1. Interfaz Web de Turso
**Problema:** Error "connection not opened"  
**Causa:** Problema temporal de la interfaz web de Turso  
**Solución:** Usar la app de escritorio o el frontend web (ambos funcionan)

### 2. Nombres de Columnas
**Problema:** Inconsistencia PascalCase vs minúsculas  
**Solución:** Estandarizado a minúsculas en todo el código
- `descriEditorial` (no `Editorial`)
- `titulo` (no `Titulo`)
- `anyoEdicion` (no `AnoPublicacion`)

### 3. Límites de Consulta
**Problema:** Consultas limitadas a 500/100 registros  
**Solución:** Eliminados todos los límites LIMIT en SQL

---

## Próximos Pasos

### Funcionalidades Pendientes
1. **Vista de detalle** - Página individual para cada libro
2. **Filtros avanzados** - Por editorial, año, género
3. **Autenticación** - Sistema de usuarios
4. **API REST** - Backend intermedio opcional
5. **Despliegue** - Vercel para frontend

### Optimizaciones
1. **Caché** - localStorage para resultados
2. **Infinite scroll** - Alternativa a paginación
3. **Búsqueda en tiempo real** - Con debounce
4. **Service Worker** - Funcionamiento offline

---

## Tecnologías Utilizadas

### Backend
- Python 3.x
- SQLite 3
- Turso (libSQL)
- Requests

### Frontend
- React 18.3.1
- Vite 6.0.3
- JavaScript ES6+
- CSS3

### Servicios
- Turso Cloud (Base de datos)
- Cloudinary (Imágenes)
- Vercel (Despliegue - pendiente)

### Herramientas
- Git / GitHub
- npm / Node.js
- Tkinter (GUI Python)

---

## Contacto

**Desarrollador:** Marcos García  
**Email:** socramaicrag@gmail.com  
**GitHub:** https://github.com/Marcosgarciagarcia/Catalogo-Nuevo

---

## Licencia

Proyecto académico - UOC Proyecto Final

---

**Última Actualización:** 29 de enero de 2026
