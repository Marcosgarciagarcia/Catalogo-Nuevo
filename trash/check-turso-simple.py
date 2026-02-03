import os
import sys
import requests
import json

TURSO_URL = os.getenv('TURSO_DATABASE_URL')
TURSO_TOKEN = os.getenv('TURSO_AUTH_TOKEN')

if not TURSO_URL or not TURSO_TOKEN:
    print("❌ Error: Faltan credenciales")
    sys.exit(1)

http_url = TURSO_URL.replace('libsql://', 'https://')

headers = {
    'Authorization': f'Bearer {TURSO_TOKEN}',
    'Content-Type': 'application/json'
}

print("=" * 70)
print("VERIFICACIÓN SIMPLE DE TURSO")
print("=" * 70)

# Test 1: Contar tablas
print("\n1️⃣ Consultando tablas...")
payload = {
    'statements': [{
        'q': "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    }]
}

try:
    response = requests.post(http_url, headers=headers, json=payload, timeout=30)
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   Tipo de respuesta: {type(data)}")
        print(f"   Contenido (primeros 500 chars):")
        print(f"   {json.dumps(data, indent=2)[:500]}")
        
        # Intentar extraer tablas
        tables = []
        if isinstance(data, list) and len(data) > 0:
            first = data[0]
            if 'results' in first:
                for result in first['results']:
                    if 'response' in result:
                        rows = result['response'].get('result', {}).get('rows', [])
                        tables = [row[0] for row in rows]
        
        if tables:
            print(f"\n   ✅ Encontradas {len(tables)} tablas:")
            for t in tables[:10]:
                print(f"      - {t}")
        else:
            print("\n   ⚠️ No se pudieron extraer nombres de tablas")
    else:
        print(f"   ❌ Error: {response.text}")
        
except Exception as e:
    print(f"   ❌ Excepción: {str(e)}")

# Test 2: Contar registros en core_titulos
print("\n2️⃣ Consultando core_titulos...")
payload = {
    'statements': [{
        'q': "SELECT COUNT(*) FROM core_titulos"
    }]
}

try:
    response = requests.post(http_url, headers=headers, json=payload, timeout=30)
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        
        # Intentar extraer count
        count = None
        if isinstance(data, list) and len(data) > 0:
            first = data[0]
            if 'results' in first:
                for result in first['results']:
                    if 'response' in result:
                        rows = result['response'].get('result', {}).get('rows', [])
                        if rows:
                            count = rows[0][0]
        
        if count is not None:
            print(f"   ✅ Total de libros: {count}")
        else:
            print(f"   ⚠️ No se pudo obtener el conteo")
            print(f"   Respuesta: {json.dumps(data, indent=2)[:300]}")
    else:
        print(f"   ❌ Error: {response.text}")
        
except Exception as e:
    print(f"   ❌ Excepción: {str(e)}")

# Test 3: Obtener muestra de libros
print("\n3️⃣ Obteniendo muestra de libros...")
payload = {
    'statements': [{
        'q': "SELECT id, EAN, Titulo FROM core_titulos LIMIT 5"
    }]
}

try:
    response = requests.post(http_url, headers=headers, json=payload, timeout=30)
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        
        # Intentar extraer libros
        libros = []
        if isinstance(data, list) and len(data) > 0:
            first = data[0]
            if 'results' in first:
                for result in first['results']:
                    if 'response' in result:
                        rows = result['response'].get('result', {}).get('rows', [])
                        libros = rows
        
        if libros:
            print(f"   ✅ Libros encontrados:")
            for libro in libros:
                print(f"      {libro[0]}. [{libro[1]}] {libro[2][:50]}")
        else:
            print(f"   ⚠️ No se pudieron obtener libros")
            
except Exception as e:
    print(f"   ❌ Excepción: {str(e)}")

print("\n" + "=" * 70)
print("DIAGNÓSTICO")
print("=" * 70)

print("""
Si ves errores arriba, es posible que:
1. La base de datos esté vacía (no se migró correctamente)
2. Haya un problema con las credenciales
3. La tabla core_titulos no exista

Si el dashboard de Turso muestra 0 registros pero aquí sí hay datos,
es un problema de visualización del dashboard.
""")
