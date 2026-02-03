"""
Verificar qué tablas existen en Turso
"""
import requests

TURSO_URL = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA'

print("Verificando tablas en Turso...\n")

# Listar todas las tablas
query = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"

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
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code != 200:
        print(f"❌ Error HTTP: {response.status_code}")
        print(f"Response: {response.text}")
        exit(1)
    
    data = response.json()
    print(f"\nResponse JSON: {data}\n")
    
    if 'results' in data and data['results']:
        result = data['results'][0]
        
        if 'error' in result:
            print(f"❌ Error SQL: {result['error']}")
            exit(1)
        
        rows = result.get('rows', [])
        print(f"📊 Total de tablas en Turso: {len(rows)}\n")
        
        print("Tablas encontradas:")
        for row in rows:
            print(f"  • {row[0]}")
        
        # Verificar si existe auth_user
        table_names = [row[0] for row in rows]
        if 'auth_user' in table_names:
            print("\n✅ La tabla auth_user EXISTE en Turso")
        else:
            print("\n⚠️ La tabla auth_user NO EXISTE en Turso")
            print("Necesitas crearla primero o ejecutar la sincronización desde el script SQL")
    else:
        print("⚠️ No se obtuvieron resultados")
        
except Exception as e:
    print(f"❌ Excepción: {str(e)}")
    import traceback
    traceback.print_exc()
