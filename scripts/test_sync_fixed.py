"""
Script corregido para probar sincronización de usuarios
"""
import sqlite3
import requests

# Configuración
LOCAL_DB = r'C:\ProyectosDjango\casateca\db.sqlite3'
TURSO_URL = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA'

def query_turso(sql):
    """Ejecutar query en Turso"""
    try:
        response = requests.post(
            TURSO_URL,
            headers={
                "Authorization": f"Bearer {TURSO_TOKEN}",
                "Content-Type": "application/json"
            },
            json={
                "statements": [sql]
            }
        )
        
        if response.status_code != 200:
            print(f"❌ Error HTTP: {response.status_code}")
            return None
        
        data = response.json()
        
        # El formato correcto es: [{'results': {'columns': [...], 'rows': [...]}}]
        if isinstance(data, list) and len(data) > 0:
            if 'results' in data[0]:
                results = data[0]['results']
                if 'error' in results:
                    print(f"❌ Error SQL: {results['error']}")
                    return None
                return results.get('rows', [])
        
        return None
    except Exception as e:
        print(f"❌ Excepción: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

print("="*80)
print("PRUEBA DE SINCRONIZACIÓN DE USUARIOS")
print("="*80)

# 1. Verificar usuarios en LOCAL
print("\n📂 USUARIOS EN LOCAL (SQLite):")
print("-"*80)
conn = sqlite3.connect(LOCAL_DB)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
local_users = cursor.execute("SELECT id, username, email, is_staff, is_superuser FROM auth_user ORDER BY id").fetchall()
print(f"Total: {len(local_users)} usuarios\n")
for u in local_users:
    print(f"  ID: {u['id']:2d} | Username: {u['username']:15s} | Email: {(u['email'] or 'N/A'):30s} | Staff: {u['is_staff']} | Super: {u['is_superuser']}")
conn.close()

# 2. Verificar usuarios en TURSO
print("\n☁️  USUARIOS EN TURSO:")
print("-"*80)
turso_users = query_turso("SELECT id, username, email, is_staff, is_superuser FROM auth_user ORDER BY id")
if turso_users is not None:
    print(f"Total: {len(turso_users)} usuarios\n")
    if len(turso_users) > 0:
        for u in turso_users:
            print(f"  ID: {u[0]:2d} | Username: {u[1]:15s} | Email: {(u[2] or 'N/A'):30s} | Staff: {u[3]} | Super: {u[4]}")
    else:
        print("  ℹ️ No hay usuarios en Turso")
else:
    print("⚠️ No se pudieron obtener usuarios de Turso")
    turso_users = []

# 3. Comparar
print("\n🔍 COMPARACIÓN:")
print("-"*80)
local_ids = {u['id'] for u in local_users}
turso_ids = {u[0] for u in turso_users} if turso_users else set()

only_local = local_ids - turso_ids
only_turso = turso_ids - local_ids
in_both = local_ids & turso_ids

print(f"  • En ambos: {len(in_both)} usuarios")
print(f"  • Solo en LOCAL: {len(only_local)} usuarios {list(only_local) if only_local else ''}")
print(f"  • Solo en TURSO: {len(only_turso)} usuarios {list(only_turso) if only_turso else ''}")

# 4. Proponer acción
print("\n📝 RECOMENDACIÓN:")
print("-"*80)
if only_local:
    print(f"  ✅ Hay {len(only_local)} usuario(s) en LOCAL que no están en TURSO")
    print("  → Ejecuta 'Local → Turso' para sincronizarlos")
    print("\n  Para hacerlo:")
    print("     1. Abre catalogo_manager.py")
    print("     2. Ve al menú 'Sincronización'")
    print("     3. Selecciona 'Local → Turso'")
if only_turso:
    print(f"  ✅ Hay {len(only_turso)} usuario(s) en TURSO que no están en LOCAL")
    print("  → Ejecuta 'Turso → Local' para sincronizarlos")
if not only_local and not only_turso:
    print("  ✅ Ambas bases de datos tienen los mismos usuarios")
    print("  → Puedes probar 'Sincronización Completa' para verificar que los datos coinciden")

print("\n" + "="*80)
