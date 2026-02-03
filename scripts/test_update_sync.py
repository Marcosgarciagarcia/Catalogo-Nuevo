"""
Probar actualización de usuario y sincronización
"""
import sqlite3
import requests
from datetime import datetime

LOCAL_DB = r'C:\ProyectosDjango\casateca\db.sqlite3'
TURSO_URL = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA'

def query_turso(sql, params=None):
    """Ejecutar query en Turso"""
    try:
        payload = {"statements": [sql]} if not params else [{"q": sql, "params": params}]
        response = requests.post(
            TURSO_URL,
            headers={
                "Authorization": f"Bearer {TURSO_TOKEN}",
                "Content-Type": "application/json"
            },
            json=payload
        )
        
        if response.status_code != 200:
            return None
        
        data = response.json()
        if isinstance(data, list) and len(data) > 0:
            if 'results' in data[0]:
                return data[0]['results']
        return None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

print("="*80)
print("PRUEBA DE ACTUALIZACIÓN Y SINCRONIZACIÓN")
print("="*80)

# 1. Actualizar usuario en local
print("\n📝 PASO 1: Actualizar usuario en LOCAL")
print("-"*80)
conn = sqlite3.connect(LOCAL_DB)
cursor = conn.cursor()

# Actualizar email y nombre
cursor.execute("""
    UPDATE auth_user 
    SET email = 'updated@sync.com',
        first_name = 'Usuario',
        last_name = 'Actualizado'
    WHERE username = 'test_sync'
""")
conn.commit()

# Verificar cambios
user = cursor.execute("""
    SELECT id, username, email, first_name, last_name
    FROM auth_user WHERE username = 'test_sync'
""").fetchone()

print(f"✅ Usuario actualizado en LOCAL:")
print(f"  • ID: {user[0]}")
print(f"  • Username: {user[1]}")
print(f"  • Email: {user[2]} (CAMBIADO)")
print(f"  • Nombre: {user[3]} {user[4]} (CAMBIADO)")

# 2. Verificar estado actual en Turso (antes de sincronizar)
print("\n☁️  PASO 2: Estado ANTES de sincronizar en TURSO")
print("-"*80)
result = query_turso("SELECT id, username, email, first_name, last_name FROM auth_user WHERE username = 'test_sync'")
if result and 'rows' in result and len(result['rows']) > 0:
    old_turso = result['rows'][0]
    print(f"  • Email en Turso: {old_turso[2]} (ANTIGUO)")
    print(f"  • Nombre en Turso: {old_turso[3]} {old_turso[4]} (ANTIGUO)")

# 3. Sincronizar UPDATE
print("\n🔄 PASO 3: Sincronizando UPDATE a TURSO...")
print("-"*80)

user_full = cursor.execute("""
    SELECT id, password, last_login, is_superuser, first_name, last_name, 
           email, is_staff, is_active
    FROM auth_user WHERE username = 'test_sync'
""").fetchone()

sql = """UPDATE auth_user SET 
    password = ?, last_login = ?, is_superuser = ?, first_name = ?,
    last_name = ?, email = ?, is_staff = ?, is_active = ?
    WHERE id = ?"""

params = [
    user_full[1],  # password
    user_full[2],  # last_login
    user_full[3],  # is_superuser
    user_full[4],  # first_name
    user_full[5],  # last_name
    user_full[6],  # email
    user_full[7],  # is_staff
    user_full[8],  # is_active
    user_full[0]   # id
]

try:
    response = requests.post(
        TURSO_URL,
        headers={
            "Authorization": f"Bearer {TURSO_TOKEN}",
            "Content-Type": "application/json"
        },
        json={
            "statements": [{"q": sql, "params": params}]
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, list) and len(data) > 0:
            if 'results' in data[0]:
                results = data[0]['results']
                if 'error' in results:
                    print(f"❌ Error: {results['error']}")
                else:
                    print(f"✅ UPDATE ejecutado correctamente")
    else:
        print(f"❌ Error HTTP: {response.status_code}")
except Exception as e:
    print(f"❌ Error: {str(e)}")

conn.close()

# 4. Verificar en Turso después de sincronizar
print("\n✅ PASO 4: Verificar cambios en TURSO")
print("-"*80)
result = query_turso("SELECT id, username, email, first_name, last_name FROM auth_user WHERE username = 'test_sync'")

if result and 'rows' in result and len(result['rows']) > 0:
    new_turso = result['rows'][0]
    print(f"✅ Usuario actualizado en TURSO:")
    print(f"  • ID: {new_turso[0]}")
    print(f"  • Username: {new_turso[1]}")
    print(f"  • Email: {new_turso[2]} ✓")
    print(f"  • Nombre: {new_turso[3]} {new_turso[4]} ✓")
    
    if new_turso[2] == 'updated@sync.com' and new_turso[3] == 'Usuario' and new_turso[4] == 'Actualizado':
        print("\n" + "="*80)
        print("🎉 ¡ACTUALIZACIÓN SINCRONIZADA CORRECTAMENTE!")
        print("="*80)
        print("\nLos cambios en LOCAL se reflejaron correctamente en TURSO")
    else:
        print("\n⚠️ Los datos no coinciden")
else:
    print("❌ Usuario no encontrado en Turso")
