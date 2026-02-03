"""
Eliminar usuario de prueba de ambas bases de datos
"""
import sqlite3
import requests

LOCAL_DB = r'C:\ProyectosDjango\casateca\db.sqlite3'
TURSO_URL = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA'

print("="*80)
print("LIMPIEZA - ELIMINAR USUARIO DE PRUEBA")
print("="*80)

# 1. Eliminar de LOCAL
print("\n🗑️  PASO 1: Eliminar de LOCAL")
print("-"*80)
conn = sqlite3.connect(LOCAL_DB)
cursor = conn.cursor()

cursor.execute("DELETE FROM auth_user WHERE username = 'test_sync'")
deleted_local = cursor.rowcount
conn.commit()
conn.close()

if deleted_local > 0:
    print(f"✅ Usuario 'test_sync' eliminado de LOCAL ({deleted_local} registro)")
else:
    print("ℹ️ Usuario 'test_sync' no encontrado en LOCAL")

# 2. Eliminar de TURSO
print("\n🗑️  PASO 2: Eliminar de TURSO")
print("-"*80)

try:
    response = requests.post(
        TURSO_URL,
        headers={
            "Authorization": f"Bearer {TURSO_TOKEN}",
            "Content-Type": "application/json"
        },
        json={
            "statements": ["DELETE FROM auth_user WHERE username = 'test_sync'"]
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
                    rows_affected = results.get('rows_affected', 0)
                    if rows_affected > 0:
                        print(f"✅ Usuario 'test_sync' eliminado de TURSO ({rows_affected} registro)")
                    else:
                        print("ℹ️ Usuario 'test_sync' no encontrado en TURSO")
    else:
        print(f"❌ Error HTTP: {response.status_code}")
except Exception as e:
    print(f"❌ Error: {str(e)}")

# 3. Verificar limpieza
print("\n✅ PASO 3: Verificar limpieza")
print("-"*80)

# Verificar LOCAL
conn = sqlite3.connect(LOCAL_DB)
cursor = conn.cursor()
local_count = cursor.execute("SELECT COUNT(*) FROM auth_user WHERE username = 'test_sync'").fetchone()[0]
conn.close()

# Verificar TURSO
try:
    response = requests.post(
        TURSO_URL,
        headers={
            "Authorization": f"Bearer {TURSO_TOKEN}",
            "Content-Type": "application/json"
        },
        json={
            "statements": ["SELECT COUNT(*) FROM auth_user WHERE username = 'test_sync'"]
        }
    )
    
    turso_count = 0
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, list) and len(data) > 0:
            if 'results' in data[0]:
                results = data[0]['results']
                if 'rows' in results and len(results['rows']) > 0:
                    turso_count = results['rows'][0][0]
except:
    turso_count = -1

print(f"  • Usuarios 'test_sync' en LOCAL: {local_count}")
print(f"  • Usuarios 'test_sync' en TURSO: {turso_count}")

if local_count == 0 and turso_count == 0:
    print("\n" + "="*80)
    print("✅ LIMPIEZA COMPLETADA")
    print("="*80)
    print("\nEl usuario de prueba ha sido eliminado de ambas bases de datos")
else:
    print("\n⚠️ Aún quedan registros del usuario de prueba")

print("\n📊 Estado final de usuarios:")
print("-"*80)
conn = sqlite3.connect(LOCAL_DB)
cursor = conn.cursor()
total = cursor.execute("SELECT COUNT(*) FROM auth_user").fetchone()[0]
print(f"  • Total usuarios en LOCAL: {total}")
conn.close()

try:
    response = requests.post(
        TURSO_URL,
        headers={
            "Authorization": f"Bearer {TURSO_TOKEN}",
            "Content-Type": "application/json"
        },
        json={
            "statements": ["SELECT COUNT(*) FROM auth_user"]
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, list) and len(data) > 0:
            if 'results' in data[0]:
                results = data[0]['results']
                if 'rows' in results and len(results['rows']) > 0:
                    turso_total = results['rows'][0][0]
                    print(f"  • Total usuarios en TURSO: {turso_total}")
except:
    pass
