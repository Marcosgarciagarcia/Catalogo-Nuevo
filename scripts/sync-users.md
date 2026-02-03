# Sincronización de Usuarios entre SQLite Local y Turso

## 📊 Estado Actual

- **SQLite Local**: `db.sqlite3` (usado por Django en desarrollo)
- **Turso Producción**: `catalogo-prueba` (usado por Vercel)
- **Sincronización**: Manual (no automática)

---

## 🔄 Proceso de Sincronización

### **Opción 1: Sincronizar SOLO la tabla auth_user (Recomendado)**

```powershell
# 1. Exportar solo la tabla auth_user desde SQLite local
sqlite3 db.sqlite3 ".dump auth_user" > auth_user_export.sql

# 2. Limpiar la tabla en Turso (CUIDADO: esto borra usuarios existentes)
turso db shell catalogo-prueba "DELETE FROM auth_user;"

# 3. Importar los usuarios a Turso
turso db shell catalogo-prueba < auth_user_export.sql
```

### **Opción 2: Sincronizar toda la base de datos**

```powershell
# 1. Exportar toda la base de datos local
sqlite3 db.sqlite3 .dump > database-export.sql

# 2. Importar a Turso (esto sobrescribe TODO)
turso db shell catalogo-prueba < database-export.sql
```

---

## ✅ Verificar Sincronización

### **Ver usuarios en SQLite local:**
```powershell
sqlite3 db.sqlite3 "SELECT id, username, email, is_superuser, is_staff FROM auth_user;"
```

### **Ver usuarios en Turso:**
```powershell
turso db shell catalogo-prueba "SELECT id, username, email, is_superuser, is_staff FROM auth_user;"
```

---

## 👤 Crear Nuevo Usuario

### **Método 1: Django Admin (Recomendado)**

1. Inicia el servidor Django local:
   ```powershell
   python manage.py runserver
   ```

2. Ve a: http://localhost:8000/admin

3. Login con tu usuario admin

4. Ve a "Users" → "Add User"

5. Crea el usuario con contraseña

6. **Sincroniza con Turso** usando Opción 1 arriba

### **Método 2: Django Shell**

```powershell
python manage.py shell
```

```python
from django.contrib.auth.models import User

# Crear usuario normal
user = User.objects.create_user(
    username='nuevo_usuario',
    email='usuario@example.com',
    password='contraseña_segura'
)

# Crear usuario admin
admin = User.objects.create_superuser(
    username='nuevo_admin',
    email='admin@example.com',
    password='contraseña_admin'
)
```

Luego sincroniza con Turso.

---

## ⚠️ Consideraciones Importantes

### **Conflictos de ID:**
- Si creas usuarios en ambas bases de datos por separado, pueden tener IDs conflictivos
- **Solución**: Siempre crea usuarios en SQLite local y sincroniza a Turso

### **Contraseñas:**
- Las contraseñas están hasheadas con PBKDF2 (Django)
- La sincronización mantiene los hashes, no necesitas reintroducir contraseñas

### **Frecuencia de Sincronización:**
- Sincroniza cada vez que crees/modifiques usuarios
- No es necesario sincronizar si solo cambias datos de libros

---

## 🚀 Script de Sincronización Rápida

Guarda este script como `sync-users.ps1`:

```powershell
# sync-users.ps1
Write-Host "🔄 Sincronizando usuarios de SQLite local a Turso..." -ForegroundColor Cyan

# Exportar usuarios
Write-Host "📤 Exportando usuarios desde SQLite local..." -ForegroundColor Yellow
sqlite3 db.sqlite3 ".dump auth_user" > auth_user_export.sql

# Verificar que el archivo se creó
if (Test-Path auth_user_export.sql) {
    Write-Host "✅ Exportación exitosa" -ForegroundColor Green
    
    # Importar a Turso
    Write-Host "📥 Importando usuarios a Turso..." -ForegroundColor Yellow
    turso db shell catalogo-prueba < auth_user_export.sql
    
    Write-Host "✅ Sincronización completada" -ForegroundColor Green
    
    # Limpiar archivo temporal
    Remove-Item auth_user_export.sql
} else {
    Write-Host "❌ Error en la exportación" -ForegroundColor Red
}
```

**Uso:**
```powershell
.\sync-users.ps1
```

---

## 📝 Notas

- La sincronización es **unidireccional**: Local → Turso
- **NO sincronices** de Turso → Local (perderías cambios locales)
- Siempre haz backup antes de sincronizar
- Los usuarios creados en producción (Turso) se perderán en la próxima sincronización
