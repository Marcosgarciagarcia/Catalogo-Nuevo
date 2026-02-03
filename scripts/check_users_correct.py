import sqlite3

# Base de datos local correcta
db_path = r'C:\ProyectosDjango\casateca\db.sqlite3'

print(f"📂 Conectando a: {db_path}\n")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Verificar si existe la tabla auth_user
tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='auth_user'").fetchall()

if not tables:
    print("⚠️ La tabla auth_user NO existe en esta base de datos")
else:
    print("✅ Tabla auth_user encontrada\n")
    
    # Contar usuarios
    count = cursor.execute("SELECT COUNT(*) FROM auth_user").fetchone()[0]
    print(f"📊 Total de usuarios: {count}\n")
    
    if count > 0:
        # Listar usuarios
        print("👥 Usuarios en la base de datos local:")
        print("="*80)
        users = cursor.execute("""
            SELECT id, username, email, first_name, last_name, is_staff, is_superuser, 
                   is_active, date_joined, last_login 
            FROM auth_user 
            ORDER BY id
        """).fetchall()
        
        for u in users:
            print(f"\n  🆔 ID: {u[0]}")
            print(f"     👤 Username: {u[1]}")
            print(f"     📧 Email: {u[2]}")
            print(f"     📝 Nombre: {u[3]} {u[4]}")
            print(f"     👔 Staff: {'Sí' if u[5] else 'No'}")
            print(f"     ⭐ Superuser: {'Sí' if u[6] else 'No'}")
            print(f"     ✅ Activo: {'Sí' if u[7] else 'No'}")
            print(f"     📅 Registrado: {u[8]}")
            print(f"     🔐 Último login: {u[9] if u[9] else 'Nunca'}")
    else:
        print("ℹ️ No hay usuarios en la base de datos")

conn.close()

print("\n" + "="*80)
print("✅ Verificación completada")
