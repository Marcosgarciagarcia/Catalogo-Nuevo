# 📚 Catálogo Manager - Aplicación de Escritorio

Aplicación de escritorio para gestionar tu catálogo de libros con sincronización bidireccional entre SQLite Local y Turso Cloud.

---

## 🚀 Características

✅ **CRUD Completo** - Crear, leer, actualizar y eliminar libros  
✅ **Dual Database** - Trabaja con SQLite local o Turso en la nube  
✅ **Sincronización** - Sincroniza cambios entre ambas bases de datos  
✅ **Búsqueda Avanzada** - Busca por título o autor  
✅ **Estadísticas** - Ve estadísticas de ambas bases de datos  
✅ **Interfaz Gráfica** - Fácil de usar con tkinter  

---

## 📋 Requisitos

```bash
# Python 3.7 o superior
python --version

# Librerías necesarias (ya deberías tenerlas instaladas)
pip install requests
```

**Nota:** `tkinter` viene incluido con Python en Windows.

---

## 🎯 Cómo Usar

### **1. Ejecutar la Aplicación**

```bash
cd C:\Cursos\UOC\Proyecto_Final\Catalogo-Nuevo
python catalogo_manager.py
```

### **2. Interfaz Principal**

La aplicación tiene **4 pestañas**:

#### **📚 Catálogo**
- **Ver libros** de tu base de datos local o Turso
- **Buscar** por título o autor
- **Seleccionar fuente**: Local o Turso
- **Doble clic** en un libro para editarlo
- **Botones**:
  - 🔍 Buscar - Busca libros
  - 🔄 Actualizar - Recarga la lista
  - ✏️ Editar - Edita el libro seleccionado
  - 🗑️ Eliminar - Elimina el libro seleccionado
  - ➕ Nuevo - Crea un nuevo libro

#### **✏️ Editar/Crear**
- **Formulario completo** para editar o crear libros
- **Campos disponibles**:
  - EAN, Título, Título Original
  - Autor (desplegable)
  - Editorial (desplegable)
  - Año de Publicación
  - Número de Páginas
  - ISBN
  - URL de Cloudinary
  - Sinopsis (texto largo)
- **Botones de guardado**:
  - 💾 Guardar en Local - Solo en SQLite local
  - ☁️ Guardar en Turso - Solo en Turso
  - 💾☁️ Guardar en Ambos - En ambas bases de datos
  - 🔄 Limpiar - Limpia el formulario

#### **🔄 Sincronización**
- **⬆️ Local → Turso** - Sube cambios de local a Turso
- **⬇️ Turso → Local** - Descarga cambios de Turso a local
- **🔄 Sincronización Bidireccional** - Sincroniza en ambas direcciones
- **👁️ Ver Diferencias** - Muestra diferencias sin aplicar cambios
- **Log de sincronización** - Ve el historial de operaciones

#### **📊 Estadísticas**
- **Estadísticas de BD Local**:
  - Total de libros
  - Total de autores
  - Total de editoriales
  - Libros con imagen
- **Estadísticas de Turso**:
  - Mismas métricas que local
- **🔄 Actualizar** - Refresca las estadísticas

---

## 💡 Flujos de Trabajo Recomendados

### **Flujo 1: Trabajar Solo en Local**

1. Selecciona fuente: **Local**
2. Busca, edita o crea libros
3. Guarda con **💾 Guardar en Local**
4. Cuando quieras, sincroniza con **⬆️ Local → Turso**

### **Flujo 2: Trabajar Solo en Turso**

1. Selecciona fuente: **Turso**
2. Busca, edita o crea libros
3. Guarda con **☁️ Guardar en Turso**
4. Los cambios están inmediatamente en la nube

### **Flujo 3: Trabajo Híbrido**

1. Trabaja en **Local** cuando no tengas internet
2. Guarda con **💾 Guardar en Local**
3. Cuando tengas conexión, usa **⬆️ Local → Turso**
4. Para obtener cambios de otros lugares: **⬇️ Turso → Local**

### **Flujo 4: Guardar en Ambos**

1. Edita un libro
2. Guarda con **💾☁️ Guardar en Ambos**
3. El libro se actualiza en local y Turso simultáneamente

---

## 🔧 Configuración

### **Rutas de Base de Datos**

La aplicación está configurada para:

- **SQLite Local:** `C:\ProyectosDjango\casateca\db.sqlite3`
- **Turso Cloud:** `catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io`

Si necesitas cambiar estas rutas, edita las líneas 16-18 en `catalogo_manager.py`:

```python
self.local_db = r'C:\ProyectosDjango\casateca\db.sqlite3'
self.turso_url = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
self.turso_token = 'tu-token-aqui'
```

---

## ⚠️ Consideraciones Importantes

### **Sincronización**

- La sincronización **básica** está implementada
- La sincronización **bidireccional completa** con resolución de conflictos está en desarrollo
- **Recomendación:** Usa "Ver Diferencias" antes de sincronizar

### **Conflictos**

Si modificas el mismo libro en local y Turso:
- La sincronización usa la **fecha de actualización** (`updated`)
- El registro más reciente **sobrescribe** al más antiguo
- **Backup recomendado** antes de sincronizaciones masivas

### **Rendimiento**

- La lista de libros está limitada a **500 registros** por defecto
- Usa la **búsqueda** para encontrar libros específicos
- Las estadísticas se actualizan manualmente con el botón 🔄

---

## 🎨 Atajos de Teclado

- **Enter** en búsqueda → Ejecuta la búsqueda
- **Doble clic** en libro → Edita el libro
- **Tab** → Navega entre campos del formulario

---

## 📝 Ejemplos de Uso

### **Crear un Nuevo Libro**

1. Ve a la pestaña **📚 Catálogo**
2. Haz clic en **➕ Nuevo**
3. Rellena el formulario en la pestaña **✏️ Editar/Crear**
4. Selecciona autor y editorial de los desplegables
5. Haz clic en **💾☁️ Guardar en Ambos**

### **Buscar y Editar un Libro**

1. En la pestaña **📚 Catálogo**
2. Escribe "Harry Potter" en el campo de búsqueda
3. Presiona **Enter** o haz clic en **🔍 Buscar**
4. **Doble clic** en el libro que quieres editar
5. Modifica los campos necesarios
6. Guarda los cambios

### **Sincronizar Cambios**

1. Ve a la pestaña **🔄 Sincronización**
2. Haz clic en **👁️ Ver Diferencias** para ver qué cambiaría
3. Revisa el log
4. Si todo está bien, haz clic en **⬆️ Local → Turso**
5. Verifica en el log que la sincronización fue exitosa

### **Ver Estadísticas**

1. Ve a la pestaña **📊 Estadísticas**
2. Haz clic en **🔄 Actualizar Estadísticas**
3. Compara los números entre Local y Turso
4. Si hay diferencias, considera sincronizar

---

## 🐛 Solución de Problemas

### **Error: "No se puede conectar a la base de datos local"**

**Solución:**
- Verifica que la ruta en `self.local_db` sea correcta
- Asegúrate de que el archivo `db.sqlite3` existe
- Comprueba que tienes permisos de lectura/escritura

### **Error: "Error en Turso: 401 Unauthorized"**

**Solución:**
- Verifica que el token de Turso sea válido
- El token puede haber expirado, genera uno nuevo en el dashboard
- Actualiza `self.turso_token` con el nuevo token

### **Error: "No se encontraron autores/editoriales"**

**Solución:**
- Asegúrate de que las tablas `core_autores` y `core_editoriales` tienen datos
- Cambia la fuente (Local/Turso) y vuelve a cargar
- Reinicia la aplicación

### **La aplicación se congela durante la sincronización**

**Solución:**
- La sincronización se ejecuta en un hilo separado, pero puede tardar
- Espera unos segundos
- Revisa el log de sincronización para ver el progreso
- Si tarda mucho, cierra y vuelve a abrir la aplicación

### **No veo todos los libros**

**Solución:**
- La lista está limitada a 500 libros por defecto
- Usa la **búsqueda** para encontrar libros específicos
- Para ver más, modifica el `LIMIT` en el código (línea ~430)

---

## 🔐 Seguridad

⚠️ **Importante:**
- El token de Turso está **hardcoded** en el código
- Para producción, usa **variables de entorno**
- No compartas el archivo `catalogo_manager.py` con el token incluido
- Considera usar un archivo `.env` para las credenciales

**Mejora recomendada:**

```python
# En lugar de hardcodear el token
import os
from dotenv import load_dotenv

load_dotenv()
self.turso_token = os.getenv('TURSO_AUTH_TOKEN')
```

---

## 🚀 Próximas Mejoras

Funcionalidades planeadas:

- [ ] Sincronización bidireccional completa con resolución de conflictos
- [ ] Importar/Exportar a CSV o Excel
- [ ] Gestión de autores y editoriales (CRUD)
- [ ] Previsualización de imágenes de Cloudinary
- [ ] Búsqueda avanzada con múltiples filtros
- [ ] Historial de cambios (audit log)
- [ ] Backup automático antes de sincronizar
- [ ] Modo oscuro
- [ ] Exportar catálogo a PDF

---

## 📞 Soporte

Si encuentras problemas o tienes sugerencias:

1. Revisa la sección de **Solución de Problemas**
2. Verifica el **log de sincronización** en la pestaña correspondiente
3. Comprueba que ambas bases de datos son accesibles

---

## 📄 Licencia

Proyecto personal - Catálogo-Nuevo  
Usuario: Marcos García (socramaicrag@gmail.com)

---

**¡Disfruta gestionando tu catálogo de libros!** 📚✨
