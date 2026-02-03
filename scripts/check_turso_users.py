import os
import requests
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

TURSO_URL = os.getenv('TURSO_DATABASE_URL')
TURSO_TOKEN = os.getenv('TURSO_AUTH_TOKEN')

if not TURSO_URL or not TURSO_TOKEN:
    print("❌ Error: Variables de entorno TURSO_DATABASE_URL o TURSO_AUTH_TOKEN no configuradas")
    exit(1)

print(f"📂 Conectando a Turso...\n")

# Query para obtener usuarios
query = "SELECT id, username, email, first_name, last_name, is_staff, is_superuser, is_active, date_joined, last_login FROM auth_user ORDER BY id"

try:
    response = requests.post(
        TURSO_URL,
        headers={
            "Authorization": f"Bearer {TURSO_TOKEN}",
            "Content-Type": "application/json"
        },
        json={
            "statements": [query]
        }
    )
    
    if response.status_code != 200:
        print(f"❌ Error en la petición: {response.status_code}")
        print(response.text)
        exit(1)
    
    data = response.json()
    
    if 'results' not in data or not data['results']:
        print("⚠️ No se obtuvieron resultados")
        exit(1)
    
    result = data['results'][0]
    
    if 'error' in result:
        print(f"❌ Error en la query: {result['error']}")
        exit(1)
    
    rows = result.get('rows', [])
    
    print(f"📊 Total de usuarios en Turso: {len(rows)}\n")
    
    if len(rows) > 0:
        print("👥 Usuarios en Turso:")
        print("="*80)
        
        for row in rows:
            print(f"\n  🆔 ID: {row[0]}")
            print(f"     👤 Username: {row[1]}")
            print(f"     📧 Email: {row[2] if row[2] else '-'}")
            print(f"     📝 Nombre: {row[3]} {row[4]}")
            print(f"     👔 Staff: {'Sí' if row[5] else 'No'}")
            print(f"     ⭐ Superuser: {'Sí' if row[6] else 'No'}")
            print(f"     ✅ Activo: {'Sí' if row[7] else 'No'}")
            print(f"     📅 Registrado: {row[8]}")
            print(f"     🔐 Último login: {row[9] if row[9] else 'Nunca'}")
    else:
        print("ℹ️ No hay usuarios en Turso")
    
    print("\n" + "="*80)
    print("✅ Verificación completada")
    
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()
