"""
Crear usuario de prueba para sincronización
"""
import sqlite3
from datetime import datetime

LOCAL_DB = r'C:\ProyectosDjango\casateca\db.sqlite3'

print("="*80)
print("CREANDO USUARIO DE PRUEBA")
print("="*80)

conn = sqlite3.connect(LOCAL_DB)
cursor = conn.cursor()

# Verificar si ya existe un usuario de prueba
existing = cursor.execute("SELECT id FROM auth_user WHERE username = 'test_sync'").fetchone()

if existing:
    print(f"\n⚠️ El usuario 'test_sync' ya existe con ID: {existing[0]}")
    print("Eliminándolo primero...")
    cursor.execute("DELETE FROM auth_user WHERE username = 'test_sync'")
    conn.commit()
    print("✅ Usuario anterior eliminado")

# Crear nuevo usuario de prueba
now = datetime.now().isoformat()
print(f"\n➕ Creando nuevo usuario 'test_sync'...")

cursor.execute("""
    INSERT INTO auth_user (
        password, last_login, is_superuser, username, first_name,
        last_name, email, is_staff, is_active, date_joined
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (
    'pbkdf2_sha256$600000$testsync$hashprueba123',  # Password hasheado
    None,  # last_login
    0,  # is_superuser
    'test_sync',  # username
    'Usuario',  # first_name
    'Prueba',  # last_name
    'test@sync.com',  # email
    0,  # is_staff
    1,  # is_active
    now  # date_joined
))
conn.commit()

# Obtener el ID del usuario creado
user_id = cursor.lastrowid
print(f"✅ Usuario creado con ID: {user_id}")

# Verificar
user = cursor.execute("""
    SELECT id, username, email, first_name, last_name, is_staff, is_superuser, is_active, date_joined
    FROM auth_user WHERE id = ?
""", (user_id,)).fetchone()

print(f"\n📋 Detalles del usuario creado:")
print(f"  • ID: {user[0]}")
print(f"  • Username: {user[1]}")
print(f"  • Email: {user[2]}")
print(f"  • Nombre: {user[3]} {user[4]}")
print(f"  • Staff: {'Sí' if user[5] else 'No'}")
print(f"  • Superuser: {'Sí' if user[6] else 'No'}")
print(f"  • Activo: {'Sí' if user[7] else 'No'}")
print(f"  • Fecha registro: {user[8]}")

conn.close()

print("\n" + "="*80)
print("✅ Usuario de prueba creado en LOCAL")
print("="*80)
print("\n📝 Próximo paso:")
print("  1. Abre catalogo_manager.py")
print("  2. Ve al menú 'Sincronización'")
print("  3. Selecciona 'Local → Turso'")
print("  4. Verifica que aparece el mensaje de sincronización del usuario 'test_sync'")
print("\nO ejecuta: python verify_sync.py para verificar automáticamente")
