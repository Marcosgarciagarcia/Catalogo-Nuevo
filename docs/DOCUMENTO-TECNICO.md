# Documento Técnico - Catálogo de Libros

## 📋 **Índice**
1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Base de Datos](#base-de-datos)
4. [Estructura del Código](#estructura-del-código)
5. [Funcionalidades CRUD](#funcionalidades-crud)
6. [Interfaz de Usuario](#interfaz-de-usuario)
7. [Validaciones y Seguridad](#validaciones-y-seguridad)
8. [Performance y Optimización](#performance-y-optimización)
9. [Despliegue y Configuración](#despliegue-y-configuración)
10. [Mantenimiento y Troubleshooting](#mantenimiento-y-troubleshooting)

---

## 📖 **Descripción General**

### **Propósito**
Aplicación de escritorio para gestión completa de catálogo de libros, incluyendo autores, editoriales y títulos con funcionalidades CRUD completas.

### **Tecnologías Principales**
- **Python 3.8+**: Lenguaje principal
- **CustomTkinter**: Framework UI moderno
- **SQLite**: Base de datos local
- **Turso**: Base de datos cloud (sincronización)
- **Cloudinary**: Almacenamiento de imágenes

### **Características Clave**
- CRUD completo para libros, autores y editoriales
- Paginación eficiente (50 items/página)
- Búsqueda accent-insensitive
- Integridad referencial
- Sincronización local/cloud
- UI moderna con tema claro/oscuro

---

## 🏗️ **Arquitectura del Sistema**

### **Arquitectura Monolítica**
```
┌─────────────────────────────────────────┐
│         Aplicación Desktop              │
│    (catalogo_manager_simple.py)         │
├─────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────────────┐ │
│  │   UI Layer  │ │   Business Logic    │ │
│  │ CustomTkinter│ │    CRUD Methods     │ │
│  └─────────────┘ └─────────────────────┘ │
├─────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────────────┐ │
│  │   Local DB  │ │    Cloud DB         │ │
│  │   SQLite    │ │     Turso           │ │
│  └─────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────┘
```

### **Componentes Principales**
- **UI Layer**: CustomTkinter con ventanas modales
- **Business Logic**: Métodos CRUD y validaciones
- **Data Access Layer**: Queries SQLite/Turso
- **Cache System**: Auto-refresh de entidades relacionadas

---

## 🗄️ **Base de Datos**

### **Esquema Principal**

#### **core_titulos** (Libros)
```sql
CREATE TABLE core_titulos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    EAN TEXT UNIQUE,
    titulo TEXT NOT NULL,
    codiAutor_id INTEGER,
    codiEditorial_id INTEGER,
    codiGenero_id INTEGER,
    codiSoporte_id INTEGER,
    codiUbicacion_id INTEGER,
    anyoEdicion INTEGER,
    portada_cloudinary TEXT,
    sinopsis TEXT,
    created DATETIME,
    updated DATETIME,
    FOREIGN KEY (codiAutor_id) REFERENCES core_autores(id),
    FOREIGN KEY (codiEditorial_id) REFERENCES core_editoriales(id)
);
```

#### **core_autores** (Autores)
```sql
CREATE TABLE core_autores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombreAutor TEXT UNIQUE NOT NULL,
    enlaceWiki TEXT,
    enlaceWiki2 TEXT,
    observaciones TEXT,
    created DATETIME,
    updated DATETIME
);
```

#### **core_editoriales** (Editoriales)
```sql
CREATE TABLE core_editoriales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descriEditorial TEXT UNIQUE NOT NULL,
    created DATETIME,
    updated DATETIME
);
```

#### **ubicaciones_sub** (Estantes)
```sql
CREATE TABLE ubicaciones_sub (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descripcion TEXT NOT NULL,
    created DATETIME
);
```

### **Relaciones**
- **Autores → Libros**: One-to-Many (integridad referencial)
- **Editoriales → Libros**: One-to-Many (integridad referencial)
- **Estantes → Libros**: One-to-Many

---

## 💻 **Estructura del Código**

### **Archivo Principal: catalogo_manager_simple.py**

#### **Clases Principales**
```python
class CatalogoManager(ctk.CTk):
    def __init__(self):
        # Inicialización de UI y variables
        
    # Métodos de navegación
    def show_catalogo(self): ...
    def show_autores(self): ...
    def show_editoriales(self): ...
    
    # Métodos CRUD - Libros
    def crear_libro(self): ...
    def editar_libro(self, libro): ...
    def eliminar_libro(self, libro): ...
    def mostrar_formulario_libro(self, libro): ...
    
    # Métodos CRUD - Autores
    def crear_autor(self): ...
    def editar_autor(self, autor): ...
    def eliminar_autor(self, autor): ...
    def mostrar_formulario_autor(self, autor): ...
    
    # Métodos CRUD - Editoriales
    def crear_editorial(self): ...
    def editar_editorial(self, editorial): ...
    def eliminar_editorial(self, editorial): ...
    def mostrar_formulario_editorial(self, editorial): ...
    
    # Métodos de base de datos
    def query_local(self, sql, params=None): ...
    def query_turso(self, sql, params=None): ...
```

#### **Variables de Estado**
```python
# Paginación
self.current_page = 0
self.items_per_page = 50
self.total_books = 0

# Autores
self.autores_current_page = 0
self.autores_items_per_page = 50
self.autores_total = 0

# Editoriales
self.editoriales_current_page = 0
self.editoriales_items_per_page = 50
self.editoriales_total = 0

# Cache
self.authors_cache = {}
self.publishers_cache = {}
```

---

## 🔧 **Funcionalidades CRUD**

### **Libros (core_titulos)**

#### **Creación**
```python
def crear_libro(self):
    self.mostrar_formulario_libro(None)

def mostrar_formulario_libro(self, libro):
    # Campos: EAN, título, autor, editorial, estante, año, portada, sinopsis
    # Validaciones: EAN obligatorio y único, título obligatorio
    # Dropdowns: autores, editoriales, estantes (desde DB)
```

#### **Edición**
```python
def editar_libro(self, libro):
    self.mostrar_formulario_libro(libro)
    # Carga datos existentes en formulario
```

#### **Eliminación**
```python
def eliminar_libro(self, libro):
    # Confirmación + DELETE FROM core_titulos WHERE id = ?
    # Recarga automática del catálogo
```

### **Autores (core_autores)**

#### **Creación**
```python
def crear_autor(self):
    self.mostrar_formulario_autor(None)

def mostrar_formulario_autor(self, autor):
    # Campos: nombre, enlaceWiki, enlaceWiki2, observaciones
    # Validaciones: nombre obligatorio y único
```

#### **Integridad Referencial**
```python
def eliminar_autor(self, autor):
    # Verifica libros asociados
    # Bloquea eliminación si hay libros
    # Mensaje específico de error
```

### **Editoriales (core_editoriales)**

#### **Funcionalidad Similar a Autores**
- CRUD completo con validaciones
- Integridad referencial con libros
- Paginación y búsqueda

---

## 🎨 **Interfaz de Usuario**

### **Tecnología: CustomTkinter**
- **Tema Dual**: Claro/Oscuro con colores personalizados
- **Componentes**: CTkFrame, CTkButton, CTkEntry, CTkComboBox
- **Layout**: Sidebar navigation + main content area

### **Estructura de UI**
```
┌─────────────────────────────────────────┐
│  ┌─────────┐ ┌─────────────────────────┐ │
│  │ Sidebar │ │      Main Frame          │ │
│  │  Nav    │ │   ┌─────────────────────┐ │ │
│  │         │ │   │    Header + Search   │ │ │
│  │         │ │   ├─────────────────────┤ │ │
│  │         │ │   │   Content Area       │ │ │
│  │         │ │   │  (Scrollable Frame) │ │ │
│  │         │ │   ├─────────────────────┤ │ │
│  │         │ │   │   Pagination         │ │ │
│  │         │ │   └─────────────────────┘ │ │
│  └─────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────┘
```

### **Componentes Clave**
- **Navigation Buttons**: Highlight dinámico según vista activa
- **Search Entries**: Búsqueda en tiempo real con Enter
- **Pagination Controls**: First/Prev/Next/Last + page numbers
- **Modal Forms**: Formularios modales para CRUD
- **Action Buttons**: Ver, Editar, Eliminar en cada fila

---

## 🔒 **Validaciones y Seguridad**

### **Validaciones de Input**
```python
# Libros
if not ean or not titulo:
    messagebox.showerror("Error", "EAN y título son obligatorios")

# Autores
if not nombre:
    messagebox.showerror("Error", "El nombre del autor es obligatorio")

# Editoriales
if not nombre:
    messagebox.showerror("Error", "El nombre de la editorial es obligatorio")
```

### **Integridad Referencial**
```python
# Autores con libros asociados
libros_result = self.query_local(
    "SELECT COUNT(*) FROM core_titulos WHERE codiAutor_id = ?", 
    (autor_id,)
)
if libros_result[0][0] > 0:
    messagebox.showerror("Error de Integridad", 
        "No se puede eliminar - tiene libros asociados")
```

### **Prevención de Duplicados**
```python
# EAN duplicado
existing = self.query_local("SELECT id FROM core_titulos WHERE EAN = ?", (ean,))
if existing:
    messagebox.showerror("Error", "Ya existe un libro con ese EAN")

# Nombre duplicado (autores/editoriales)
existing = self.query_local(
    "SELECT id FROM core_autores WHERE nombreAutor = ?", 
    (nombre,)
)
if existing:
    messagebox.showerror("Error", "Ya existe un autor con ese nombre")
```

---

## ⚡ **Performance y Optimización**

### **Paginación Eficiente**
```python
# LIMIT/OFFSET para grandes volúmenes
offset = current_page * items_per_page
sql = f"""
    SELECT * FROM core_titulos 
    ORDER BY titulo 
    LIMIT {items_per_page} OFFSET {offset}
"""
```

### **Cache System**
```python
# Auto-refresh de entidades relacionadas
def load_initial_data(self):
    # Carga autores y editoriales en cache
    self.authors_cache = {...}
    self.publishers_cache = {...}
```

### **Búsqueda Optimizada**
```python
# Accent-insensitive search
sql = """
    SELECT * FROM core_autores 
    WHERE nombreAutor LIKE ? COLLATE NOCASE
    ORDER BY nombreAutor COLLATE NOCASE
"""
```

### **Lazy Loading**
- Solo carga datos necesarios para página actual
- Dropdowns poblados desde cache
- Imágenes cargadas bajo demanda

---

## 🚀 **Despliegue y Configuración**

### **Requisitos del Sistema**
- **Python 3.8+**
- **Windows 10+** (principal)
- **Memoria RAM**: 4GB mínimo
- **Almacenamiento**: 500MB espacio libre

### **Dependencias**
```python
# requirements.txt
customtkinter==5.2.0
sqlite3 (built-in)
requests==2.31.0
Pillow==10.0.0
```

### **Configuración de Base de Datos**
```python
# Local SQLite
self.local_db = "C:\\ProyectosDjango\\casateca\\db.sqlite3"

# Turso Cloud
self.turso_url = "https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io"
self.turso_token = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### **Variables de Entorno**
```bash
# .env.local
TURSO_URL=https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io
TURSO_TOKEN=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...
CLOUDINARY_URL=cloudinary://...
```

---

## 🔧 **Mantenimiento y Troubleshooting**

### **Problemas Comunes**

#### **Conexión a Base de Datos**
```python
# Verificar ruta de SQLite
if not os.path.exists(self.local_db):
    messagebox.showerror("Error", "Base de datos local no encontrada")
```

#### **Sincronización Turso**
```python
# Verificar conexión Turso
try:
    result = self.query_turso("SELECT 1")
except Exception as e:
    messagebox.showerror("Error", f"Conexión Turso fallida: {e}")
```

#### **Rendimiento con Grandes Volúmenes**
- Usar paginación (implementado)
- Limitar resultados de búsqueda (100 max)
- Optimizar queries con índices

### **Mantenimiento Regular**

#### **Limpieza de Cache**
```python
def clear_cache(self):
    self.authors_cache.clear()
    self.publishers_cache.clear()
    self.load_initial_data()
```

#### **Verificación de Integridad**
```python
def check_integrity(self):
    # Verificar foreign keys
    # Detectar registros huérfanos
    # Validar datos duplicados
```

#### **Backup de Base de Datos**
```python
# Script de backup en scripts/backup_db.py
def backup_database():
    # Copiar archivo SQLite
    # Exportar a SQL
    # Sincronizar con Turso
```

### **Logging y Monitoreo**
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='catalogo.log'
)
```

---

## 📊 **Métricas y Monitoreo**

### **KPIs de Rendimiento**
- **Tiempo de carga**: < 2 segundos para 50 items
- **Búsqueda**: < 1 segundo para 1000+ registros
- **CRUD Operations**: < 500ms promedio
- **Memory Usage**: < 200MB en operación normal

### **Monitoreo de Errores**
```python
def log_error(self, operation, error):
    logging.error(f"Error en {operation}: {str(error)}")
    # Enviar a sistema de monitoreo si disponible
```

---

## 🔄 **Versionado y Actualizaciones**

### **Control de Versiones**
- **Git**: Control de versiones principal
- **Tags**: Versiones estables con etiquetas
- **Branches**: Features en branches separados

### **Proceso de Actualización**
1. **Backup** de base de datos actual
2. **Download** nueva versión
3. **Migrate** schema si es necesario
4. **Test** funcionalidades básicas
5. **Deploy** a producción

---

## 📞 **Soporte y Contacto**

### **Documentación Adicional**
- **Guía de Usuario**: `docs/GUIA-USUARIO.md`
- **API Reference**: `docs/API-REFERENCE.md`
- **Deployment Guide**: `docs/DEPLOYMENT.md`

### **Soporte Técnico**
- **Issues**: GitHub Issues
- **Email**: soporte@catalogo.com
- **Wiki**: Documentación en GitHub

---

## 📝 **Notas de Desarrollo**

### **SWE-.5 Integration**
- **Agente**: SWE-.5 para desarrollo automatizado
- **Memory**: Sistema de memoria persistente
- **Tools**: Integración con herramientas de desarrollo

### **Best Practices**
- **Code Review**: Revisión de código antes de commits
- **Testing**: Tests unitarios y de integración
- **Documentation**: Documentación actualizada
- **Performance**: Optimización continua

---

*Documento Técnico v1.0 - Última actualización: 03/02/2026*
