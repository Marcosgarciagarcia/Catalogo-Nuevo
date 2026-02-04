# Guía de Usuario - Catálogo de Libros

## 📋 **Índice**
1. [Introducción](#introducción)
2. [Instalación y Configuración](#instalación-y-configuración)
3. [Interfaz Principal](#interfaz-principal)
4. [Gestión de Libros](#gestión-de-libros)
5. [Gestión de Autores](#gestión-de-autores)
6. [Gestión de Editoriales](#gestión-de-editoriales)
7. [Búsqueda y Filtros](#búsqueda-y-filtros)
8. [Paginación](#paginación)
9. [Sincronización](#sincronización)
10. [Solución de Problemas](#solución-de-problemas)

---

## 📖 **Introducción**

### **¿Qué es el Catálogo de Libros?**
Aplicación de escritorio para gestionar tu biblioteca personal. Permite organizar libros, autores y editoriales con una interfaz moderna y fácil de usar.

### **Características Principales**
- ✅ **CRUD Completo**: Crear, leer, actualizar y eliminar libros, autores y editoriales
- ✅ **Búsqueda Inteligente**: Encuentra rápidamente lo que buscas
- ✅ **Paginación Eficiente**: Maneja miles de libros sin problemas
- ✅ **Sincronización Cloud**: Sincroniza entre local y nube
- ✅ **Integridad de Datos**: Protección contra eliminación accidental

---

## 🚀 **Instalación y Configuración**

### **Requisitos del Sistema**
- **Windows 10** o superior
- **Python 3.8** o superior
- **4GB RAM** mínimo
- **500MB** espacio libre

### **Pasos de Instalación**

#### 1. **Descargar Python**
```bash
# Visitar https://python.org
# Descargar Python 3.8+ y marcar "Add to PATH"
```

#### 2. **Instalar Dependencias**
```bash
pip install customtkinter requests Pillow
```

#### 3. **Ejecutar Aplicación**
```bash
python catalogo_manager_simple.py
```

### **Configuración Inicial**
La aplicación detectará automáticamente tu base de datos local:
```
C:\ProyectosDjango\casateca\db.sqlite3
```

Si usas sincronización cloud, configura tus credenciales en `.env.local`:
```bash
TURSO_URL=tu_url_turso
TURSO_TOKEN=tu_token_turso
```

---

## 🖥️ **Interfaz Principal**

### **Estructura de la Ventana**
```
┌─────────────────────────────────────────┐
│  📚 Catálogo de Libros           🌙🌞 │  ← Barra superior
├─────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────────────────────┐ │
│  │ 🏠      │ │    📚 Catálogo         │ │
│  │ 📚      │ │  ┌─────────────────────┐ │ │
│  │ 👤      │ │  │ 🔍 Buscar libros... │ │ │
│  │ 🏢      │ │  └─────────────────────┘ │ │
│  │ ⚙️      │ │  ┌─────────────────────┐ │ │
│  │ 👥      │ │  │ 📖 Título del libro │ │ │
│  │ 🔄      │ │  │ 👁️ ✏️ 🗑️           │ │ │
│  │ 📊      │ │  └─────────────────────┘ │ │
│  │ ⚙️      │ │           ...           │ │
│  └─────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────┤
│  ⏮ ◀ Página 1 de 10 (500 libros) ▶ ⏭ │  ← Paginación
└─────────────────────────────────────────┘
```

### **Barra de Navegación (Sidebar)**
- **🏠 Catálogo**: Vista principal de libros
- **📚 Catálogo**: (duplicado) Vista de libros
- **👤 Autores**: Gestión de autores
- **🏢 Editoriales**: Gestión de editoriales
- **👥 Usuarios**: Gestión de usuarios
- **🔄 Sincronización**: Sincronizar datos
- **📊 Estadísticas**: Estadísticas del catálogo
- **⚙️ Configuración**: Preferencias

### **Selector de Tema**
- **🌙 Modo Oscuro**: Tema por defecto
- **🌞 Modo Claro**: Para ambientes iluminados

---

## 📚 **Gestión de Libros**

### **Ver Libros**
1. **Navegar** a la sección **Catálogo**
2. **Explorar** la lista de libros
3. **Usar paginación** para navegar entre páginas

### **Crear Nuevo Libro**
1. **Hacer clic** en **"➕ Crear Libro"** (header del catálogo)
2. **Completar formulario**:
   - **EAN**: Código de barras (único)
   - **Título**: Nombre del libro (obligatorio)
   - **Autor**: Seleccionar del dropdown
   - **Editorial**: Seleccionar del dropdown
   - **Estante**: Seleccionar ubicación
   - **Año**: Año de edición
   - **Portada**: URL de imagen (opcional)
   - **Sinopsis**: Descripción del libro
3. **Hacer clic** en **"Guardar"**

### **Editar Libro Existente**
1. **Buscar** el libro en el catálogo
2. **Hacer clic** en **"✏️ Editar"** en la fila del libro
3. **Modificar** los campos deseados
4. **Hacer clic** en **"Guardar"**

### **Eliminar Libro**
1. **Buscar** el libro en el catálogo
2. **Hacer clic** en **"🗑️ Eliminar"** en la fila del libro
3. **Confirmar** en el diálogo de confirmación

### **Ver Detalles del Libro**
1. **Hacer clic** en **"👁️ Ver"** en la fila del libro
2. **Explorar** modal con información completa
3. **Cerrar** modal cuando termines

---

## 👤 **Gestión de Autores**

### **Ver Autores**
1. **Navegar** a **"👤 Autores"** en el sidebar
2. **Explorar** lista paginada de autores
3. **Usar búsqueda** para encontrar autores específicos

### **Crear Nuevo Autor**
1. **Hacer clic** en **"➕ Crear Autor"** (header de autores)
2. **Completar formulario**:
   - **Nombre del Autor**: Nombre completo (obligatorio)
   - **Enlace Wikipedia 1**: URL principal (opcional)
   - **Enlace Wikipedia 2**: URL secundaria (opcional)
   - **Observaciones**: Notas adicionales (opcional)
3. **Hacer clic** en **"Guardar"**

### **Editar Autor**
1. **Buscar** el autor en la lista
2. **Hacer clic** en **"✏️ Editar"**
3. **Modificar** campos deseados
4. **Hacer clic** en **"Guardar"**

### **Eliminar Autor**
⚠️ **Importante**: No se puede eliminar un autor que tiene libros asociados.

1. **Buscar** el autor
2. **Hacer clic** en **"🗑️ Eliminar"**
3. **Verificar** mensaje de integridad
4. **Confirmar** si no tiene libros asociados

---

## 🏢 **Gestión de Editoriales**

### **Ver Editoriales**
1. **Navegar** a **"🏢 Editoriales"** en el sidebar
2. **Explorar** lista paginada
3. **Usar búsqueda** para filtrar

### **Crear Nueva Editorial**
1. **Hacer clic** en **"➕ Crear Editorial"**
2. **Ingresar** nombre de la editorial (obligatorio)
3. **Hacer clic** en **"Guardar"**

### **Editar Editorial**
1. **Buscar** la editorial
2. **Hacer clic** en **"✏️ Editar"**
3. **Modificar** nombre
4. **Hacer clic** en **"Guardar"**

### **Eliminar Editorial**
⚠️ **Importante**: No se puede eliminar una editorial que tiene libros asociados.

1. **Buscar** la editorial
2. **Hacer clic** en **"🗑️ Eliminar"**
3. **Verificar** mensaje de integridad
4. **Confirmar** si no tiene libros asociados

---

## 🔍 **Búsqueda y Filtros**

### **Búsqueda de Libros**
1. **Usar campo** "Buscar libros..." en header del catálogo
2. **Seleccionar** filtro:
   - **Título**: Buscar por nombre del libro
   - **Autor**: Buscar por nombre del autor
   - **EAN**: Buscar por código de barras
3. **Escribir** término de búsqueda
4. **Presionar Enter** o hacer clic en **"🔍"**
5. **Limpiar** búsqueda con **"✖ Limpiar"**

### **Búsqueda de Autores**
1. **Navegar** a sección Autores
2. **Usar campo** "Buscar autor..."
3. **Escribir** nombre del autor
4. **Presionar Enter** para buscar

### **Búsqueda de Editoriales**
1. **Navegar** a sección Editoriales
2. **Usar campo** "Buscar editorial..."
3. **Escribir** nombre de la editorial
4. **Presionar Enter** para buscar

### **Características de Búsqueda**
- **Accent-Insensitive**: "Álvarez" = "Alvarez"
- **Case-Insensitive**: "García" = "garcía"
- **Partial Match**: "Gab" encuentra "Gabriel García Márquez"

---

## 📄 **Paginación**

### **Navegación entre Páginas**
```
⏮ Primera    ◀ Anterior    Página 3 de 10 (150 libros)    Siguiente ▶    Última ⏭
```

### **Controles de Paginación**
- **⏮ Primera**: Ir a la primera página
- **◀ Anterior**: Página anterior
- **Siguiente ▶**: Página siguiente
- **⏭ Última**: Ir a la última página
- **Números de página**: Click directo a página específica

### **Configuración**
- **50 items por página**: Configuración por defecto
- **Auto-optimización**: Maneja eficientemente grandes volúmenes
- **Memory efficient**: No carga todos los datos en memoria

---

## 🔄 **Sincronización**

### **Tipos de Base de Datos**
- **Local**: SQLite en tu computadora
- **Cloud**: Turso (sincronización en la nube)

### **Selector de Fuente de Datos**
En header del catálogo, selecciona entre:
- **🏠 Local**: Base de datos local SQLite
- **☁️ Turso**: Base de datos cloud

### **Proceso de Sincronización**
1. **Navegar** a **"🔄 Sincronización"**
2. **Seleccionar** dirección:
   - **Local → Cloud**: Subir cambios locales
   - **Cloud → Local**: Descargar cambios cloud
3. **Hacer clic** en **"Iniciar Sincronización"**
4. **Esperar** confirmación de completado

### **Consideraciones**
- **Conflictos**: La última modificación prevalece
- **Conexión**: Requiere conexión a internet para Turso
- **Backup**: Siempre haz backup antes de sincronizar

---

## ⚠️ **Solución de Problemas**

### **Problemas Comunes**

#### **Aplicación no inicia**
```bash
# Verificar instalación de Python
python --version

# Verificar CustomTkinter
pip show customtkinter

# Reinstalar si es necesario
pip install customtkinter --upgrade
```

#### **Base de datos no encontrada**
```
Error: Base de datos local no encontrada
```
**Solución**:
1. **Verificar** ruta: `C:\ProyectosDjango\casateca\db.sqlite3`
2. **Crear** base de datos si no existe
3. **Contactar** soporte técnico

#### **Error de conexión Turso**
```
Error: Conexión Turso fallida
```
**Solución**:
1. **Verificar** conexión a internet
2. **Revisar** credenciales en `.env.local`
3. **Validar** URL y token de Turso

#### **No puedo eliminar autor/editorial**
```
Error de Integridad: Tiene libros asociados
```
**Solución**:
1. **Eliminar** o **reasignar** libros asociados
2. **Verificar** que no haya dependencias
3. **Intentar** eliminar nuevamente

#### **EAN duplicado**
```
Error: Ya existe un libro con ese EAN
```
**Solución**:
1. **Verificar** EAN correcto del libro
2. **Buscar** libro existente con ese EAN
3. **Usar** EAN único para cada libro

### **Rendimiento Lento**

#### **Catálogo carga lento**
- **Usar paginación** (ya implementado)
- **Limitar** resultados de búsqueda
- **Cerrar** otras aplicaciones pesadas

#### **Búsqueda lenta**
- **Ser específico** en términos de búsqueda
- **Usar filtros** apropiados
- **Evitar** búsquedas muy generales

### **Errores de Memoria**

#### **Aplicación se cierra inesperadamente**
1. **Reiniciar** aplicación
2. **Verificar** memoria RAM disponible
3. **Reducir** número de aplicaciones abiertas

---

## 📞 **Soporte y Ayuda**

### **Recursos Disponibles**
- **📖 Documentación Técnica**: `docs/DOCUMENTO-TECNICO.md`
- **📝 Historial de Cambios**: `docs/HISTORIAL-CONVERSACION.md`
- **🚀 Guía de Despliegue**: `docs/DEPLOYMENT.md`

### **Contacto de Soporte**
- **Email**: soporte@catalogo.com
- **Issues**: GitHub Issues
- **Wiki**: Documentación completa

### **Comunidad**
- **Foro**: Discusiones y preguntas
- **Tutoriales**: Videos y guías
- **FAQ**: Preguntas frecuentes

---

## 💡 **Consejos y Trucos**

### **Atajos de Teclado**
- **Enter**: Iniciar búsqueda
- **Escape**: Cerrar modal/diálogo
- **Tab**: Navegar entre campos del formulario

### **Buenas Prácticas**
1. **Backup regular** de tu base de datos
2. **Usar EANs únicos** para cada libro
3. **Mantener actualizados** autores y editoriales
4. **Sincronizar periódicamente** si usas cloud

### **Optimización**
- **Búsqueda específica**: Usa términos precisos
- **Paginación eficiente**: No cargues todo de golpe
- **Cache automático**: La aplicación optimiza automáticamente

---

## 📊 **Estadísticas y Reportes**

### **Vista de Estadísticas**
1. **Navegar** a **"📊 Estadísticas"**
2. **Explorar** métricas disponibles:
   - Total de libros
   - Total de autores
   - Total de editoriales
   - Libros por autor
   - Libros por editorial
   - Distribución por año

### **Exportación de Datos**
- **Formato CSV**: Exportar listados
- **Reportes PDF**: Generar informes
- **Backup SQL**: Exportar base de datos completa

---

*Guía de Usuario v1.0 - Última actualización: 03/02/2026*
