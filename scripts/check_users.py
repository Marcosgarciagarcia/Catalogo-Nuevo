import sqlite3

# Verificar tablas en base de datos local
conn = sqlite3.connect('catalogo.db')
cursor = conn.cursor()

# Listar todas las tablas
tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
print("Tablas en la base de datos local:")
for table in tables:
    print(f"  - {table[0]}")

# Verificar si existe auth_user
auth_user_exists = any(t[0] == 'auth_user' for t in tables)
print(f"\n¿Existe tabla auth_user? {auth_user_exists}")

if auth_user_exists:
    # Contar usuarios
    users = cursor.execute("SELECT id, username, email, is_staff, is_superuser, is_active, date_joined FROM auth_user ORDER BY id").fetchall()
    print(f"\nTotal usuarios en local: {len(users)}")
    print("\nUsuarios:")
    for u in users:
        print(f"  ID: {u[0]}, Username: {u[1]}, Email: {u[2]}, Staff: {u[3]}, Superuser: {u[4]}, Active: {u[5]}, Joined: {u[6]}")
else:
    print("\n⚠️ La tabla auth_user NO existe en la base de datos local")
    print("Necesitas crear la tabla primero o sincronizar desde Turso")

conn.close()
