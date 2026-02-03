"""
Ejecutar sincronización Local → Turso y verificar
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
                results = data[0]['results']
                if 'error' in results:
                    print(f"❌ Error SQL: {results['error']}")
                    return None
                return results
        return None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

print("="*80)
print("SINCRONIZACIÓN LOCAL → TURSO")
print("="*80)

# 1. Verificar usuario en local
print("\n📂 PASO 1: Verificar usuario en LOCAL")
print("-"*80)
conn = sqlite3.connect(LOCAL_DB)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

test_user = cursor.execute("""
    SELECT id, username, email, first_name, last_name, password, is_staff, 
           is_superuser, is_active, date_joined, last_login
    FROM auth_user WHERE username = 'test_sync'
""").fetchone()

if not test_user:
    print("❌ Usuario test_sync no encontrado en local")
    conn.close()
    exit(1)

print(f"✅ Usuario encontrado en LOCAL:")
print(f"  • ID: {test_user['id']}")
print(f"  • Username: {test_user['username']}")
print(f"  • Email: {test_user['email']}")
print(f"  • Nombre: {test_user['first_name']} {test_user['last_name']}")

# 2. Verificar si existe en Turso
print("\n☁️  PASO 2: Verificar si existe en TURSO")
print("-"*80)
result = query_turso(f"SELECT id FROM auth_user WHERE id = {test_user['id']}")
exists_in_turso = result and 'rows' in result and len(result['rows']) > 0

if exists_in_turso:
    print(f"⚠️ Usuario ya existe en Turso con ID {test_user['id']}")
    print("Actualizándolo...")
    action = "UPDATE"
else:
    print(f"✅ Usuario NO existe en Turso. Se creará nuevo.")
    action = "INSERT"

# 3. Sincronizar
print(f"\n🔄 PASO 3: Sincronizando ({action})...")
print("-"*80)

if action == "INSERT":
    sql = """INSERT INTO auth_user (
        id, password, last_login, is_superuser, username, first_name,
        last_name, email, is_staff, is_active, date_joined
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"""
    
    params = [
        test_user['id'],
        test_user['password'],
        test_user['last_login'],
        test_user['is_superuser'],
        test_user['username'],
        test_user['first_name'],
        test_user['last_name'],
        test_user['email'],
        test_user['is_staff'],
        test_user['is_active'],
        test_user['date_joined']
    ]
else:
    sql = """UPDATE auth_user SET 
        password = ?, last_login = ?, is_superuser = ?, first_name = ?,
        last_name = ?, email = ?, is_staff = ?, is_active = ?
        WHERE id = ?"""
    
    params = [
        test_user['password'],
        test_user['last_login'],
        test_user['is_superuser'],
        test_user['first_name'],
        test_user['last_name'],
        test_user['email'],
        test_user['is_staff'],
        test_user['is_active'],
        test_user['id']
    ]

# Ejecutar sincronización
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
                    print(f"❌ Error en sincronización: {results['error']}")
                else:
                    print(f"✅ Sincronización exitosa ({action})")
    else:
        print(f"❌ Error HTTP: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"❌ Error: {str(e)}")

conn.close()

# 4. Verificar en Turso
print("\n✅ PASO 4: Verificar en TURSO")
print("-"*80)
result = query_turso(f"SELECT id, username, email, first_name, last_name FROM auth_user WHERE username = 'test_sync'")

if result and 'rows' in result and len(result['rows']) > 0:
    turso_user = result['rows'][0]
    print(f"✅ Usuario encontrado en TURSO:")
    print(f"  • ID: {turso_user[0]}")
    print(f"  • Username: {turso_user[1]}")
    print(f"  • Email: {turso_user[2]}")
    print(f"  • Nombre: {turso_user[3]} {turso_user[4]}")
    
    print("\n" + "="*80)
    print("🎉 ¡SINCRONIZACIÓN EXITOSA!")
    print("="*80)
    print("\nEl usuario 'test_sync' se ha sincronizado correctamente de LOCAL a TURSO")
else:
    print("❌ Usuario NO encontrado en Turso después de la sincronización")
    print("\n" + "="*80)
    print("⚠️ SINCRONIZACIÓN FALLÓ")
    print("="*80)
