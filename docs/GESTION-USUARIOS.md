# Gestión y Sincronización de Usuarios

## 📋 Descripción

La aplicación de escritorio ahora incluye gestión completa de usuarios con sincronización bidireccional entre SQLite local y Turso Cloud, siguiendo los mismos parámetros que libros, autores y editoriales.

---

## 🎯 Funcionalidades Implementadas

### **Pestaña de Usuarios (👥)**

La nueva pestaña permite:

- ✅ **Listar usuarios** con todos sus datos
- ✅ **Buscar usuarios** por username o email
- ✅ **Editar usuarios** (email, nombre, apellidos, permisos)
- ✅ **Eliminar usuarios** con confirmación
- ✅ **Visualizar permisos** (Admin, Staff, Activo)
- ✅ **Ver último login** de cada usuario

### **Sincronización Automática**

Los usuarios se sincronizan automáticamente en:

1. **Local → Turso** (`sync_local_to_turso`)
2. **Turso → Local** (`sync_turso_to_local`)
3. **Bidireccional** (`sync_bidirectional`)

---

## 📊 Campos Sincronizados

La tabla `auth_user` incluye:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER | ID único del usuario |
| `username` | VARCHAR(150) | Nombre de usuario (único) |
| `password` | VARCHAR(128) | Contraseña hasheada (PBKDF2) |
| `email` | VARCHAR(254) | Email del usuario |
| `first_name` | VARCHAR(150) | Nombre |
| `last_name` | VARCHAR(150) | Apellidos |
| `is_superuser` | BOOLEAN | Superusuario (admin) |
| `is_staff` | BOOLEAN | Staff (acceso admin) |
| `is_active` | BOOLEAN | Usuario activo |
| `last_login` | DATETIME | Último inicio de sesión |
| `date_joined` | DATETIME | Fecha de registro |

---

## 🔐 Seguridad de Contraseñas

### **Importante:**

Las contraseñas están hasheadas con **PBKDF2** (formato Django) y **NO se pueden crear ni modificar** desde la aplicación de escritorio.

### **Para Crear Usuarios:**

**Opción 1: Django Admin**
```bash
cd C:\ProyectosDjango\casateca
python manage.py createsuperuser
```

**Opción 2: Django Shell**
```bash
python manage.py shell
```

```python
from django.contrib.auth.models import User

# Usuario normal
user = User.objects.create_user(
    username='nuevo_usuario',
    email='usuario@example.com',
    password='contraseña_segura'
)

# Superusuario
admin = User.objects.create_superuser(
    username='admin',
    email='admin@example.com',
    password='contraseña_admin'
)
```

### **Para Cambiar Contraseñas:**

**Django Shell:**
```python
from django.contrib.auth.models import User

user = User.objects.get(username='nombre_usuario')
user.set_password('nueva_contraseña')
user.save()
```

---

## 🔄 Proceso de Sincronización

### **1. Crear Usuario en Django Local**

```bash
python manage.py createsuperuser
# Username: nuevo_admin
# Email: admin@example.com
# Password: ********
```

### **2. Sincronizar a Turso**

En la aplicación de escritorio:
1. Ve a la pestaña **🔄 Sincronización**
2. Click en **"Local → Turso"**
3. El usuario se sincronizará automáticamente

### **3. Verificar en Turso**

```bash
turso db shell catalogo-prueba "SELECT username, email, is_superuser FROM auth_user;"
```

---

## 📝 Operaciones CRUD

### **Listar Usuarios**

1. Abre la pestaña **👥 Usuarios**
2. Los usuarios se cargan automáticamente
3. Usa el campo de búsqueda para filtrar

### **Editar Usuario**

1. Selecciona un usuario de la lista
2. Click en **✏️ Editar**
3. Modifica:
   - Email
   - Nombre y apellidos
   - Permisos (Superusuario, Staff, Activo)
4. Click en **Guardar**

**Nota:** El username NO se puede modificar.

### **Eliminar Usuario**

1. Selecciona un usuario
2. Click en **🗑️ Eliminar**
3. Confirma la eliminación

**⚠️ Advertencia:** Esta acción no se puede deshacer.

---

## 🔄 Sincronización Automática

### **Parámetros de Sincronización**

Los usuarios se sincronizan con los **mismos parámetros** que libros, autores y editoriales:

- **Frecuencia:** Solo usuarios modificados en las últimas 24 horas
- **Dirección:** Bidireccional (Local ↔ Turso)
- **Conflictos:** Se sobrescribe con el dato más reciente
- **Logs:** Detallados en la pestaña de sincronización

### **Orden de Sincronización**

1. **Usuarios** (auth_user)
2. **Autores** (core_autores)
3. **Editoriales** (core_editoriales)
4. **Libros** (core_titulos)

Este orden garantiza que las dependencias se respeten.

---

## 📊 Estadísticas

La pestaña **📊 Estadísticas** ahora incluye:

- Total de usuarios
- Usuarios activos
- Superusuarios
- Usuarios staff

---

## 🚀 Uso en Producción

### **Flujo de Trabajo Recomendado**

1. **Crear usuarios en Django local** (contraseñas seguras)
2. **Sincronizar a Turso** (aplicación de escritorio)
3. **Verificar en Vercel** (frontend usa Turso)
4. **Probar login** en la aplicación web

### **Mantenimiento**

- Los usuarios se sincronizan automáticamente
- Las contraseñas se mantienen hasheadas
- Los permisos se actualizan en ambas direcciones

---

## ⚠️ Consideraciones Importantes

### **1. Contraseñas**

- ❌ **NO** crear usuarios manualmente en la BD
- ❌ **NO** modificar contraseñas directamente
- ✅ **SÍ** usar Django para gestionar contraseñas

### **2. Sincronización**

- La sincronización es **unidireccional por defecto**: Local → Turso
- Para sincronización completa, usa **Bidireccional**
- Los cambios en Turso se sobrescriben en la próxima sincronización

### **3. Permisos**

- `is_superuser`: Acceso completo (admin)
- `is_staff`: Acceso al panel de administración
- `is_active`: Usuario puede iniciar sesión

---

## 🔍 Verificación

### **Verificar Usuarios en Local**

```bash
cd C:\ProyectosDjango\casateca
python manage.py shell
```

```python
from django.contrib.auth.models import User
users = User.objects.all()
for u in users:
    print(f"{u.username} - {u.email} - Admin: {u.is_superuser}")
```

### **Verificar Usuarios en Turso**

```bash
turso db shell catalogo-prueba "SELECT username, email, is_superuser, is_staff, is_active FROM auth_user ORDER BY username;"
```

### **Verificar en Aplicación Web**

1. Abre: https://catalogo-nuevo-yngn.vercel.app
2. Click en **"Iniciar Sesión"**
3. Usa las credenciales del usuario
4. Verifica que el login funciona

---

## 📚 Archivos Relacionados

- `catalogo_manager.py` - Aplicación de escritorio con gestión de usuarios
- `api/auth/login.js` - Endpoint de login (Vercel)
- `api/auth/verify.js` - Endpoint de verificación de token (Vercel)
- `src/contexts/AuthContext.jsx` - Contexto de autenticación (React)
- `src/components/Login.jsx` - Componente de login (React)

---

## 🎉 Resumen

La gestión de usuarios está completamente integrada en la aplicación de escritorio con:

✅ CRUD completo  
✅ Sincronización bidireccional  
✅ Seguridad de contraseñas  
✅ Mismos parámetros que otras entidades  
✅ Integración con sistema de autenticación web  

---

**Última actualización:** 31 de enero de 2026  
**Versión:** 1.0.0
