import os
import sys
import json
import requests

# Configuración
JSON_PATH = r'C:\Cursos\UOC\Proyecto_Final\Catalogo-Nuevo\src\assets\data\Titulo_Autor.json'
TURSO_URL = os.getenv('TURSO_DATABASE_URL')
TURSO_TOKEN = os.getenv('TURSO_AUTH_TOKEN')

if not TURSO_URL or not TURSO_TOKEN:
    print("❌ Error: Faltan credenciales de Turso")
    sys.exit(1)

http_url = TURSO_URL.replace('libsql://', 'https://')

print("=" * 70)
print("ACTUALIZACIÓN DE URLS DE CLOUDINARY")
print("=" * 70)

# Paso 1: Añadir columna
print("\n📋 Añadiendo columna portada_cloudinary...")
headers = {
    'Authorization': f'Bearer {TURSO_TOKEN}',
    'Content-Type': 'application/json'
}

payload = {
    'statements': [{
        'q': 'ALTER TABLE core_titulos ADD COLUMN portada_cloudinary TEXT'
    }]
}

try:
    response = requests.post(http_url, headers=headers, json=payload, timeout=30)
    if response.status_code == 200:
        print("✅ Columna añadida")
    else:
        print(f"⚠️  Respuesta: {response.status_code} (columna podría ya existir)")
except Exception as e:
    print(f"⚠️  Error: {str(e)}")

# Paso 2: Leer JSON
print("\n📖 Leyendo JSON...")
with open(JSON_PATH, 'r', encoding='utf-8') as f:
    json_data = json.load(f)

print(f"✅ {len(json_data)} registros en JSON")

# Paso 3: Actualizar directamente por EAN
print("\n💾 Actualizando URLs...")

updated = 0
not_found = 0
batch_size = 20

for i in range(0, len(json_data), batch_size):
    batch = json_data[i:i+batch_size]
    statements = []
    
    for libro in batch:
        ean = libro.get('EAN')
        portada = libro.get('portada', {})
        url = portada.get('url') if isinstance(portada, dict) else None
        
        if ean and url:
            statements.append({
                'q': 'UPDATE core_titulos SET portada_cloudinary = ? WHERE EAN = ?',
                'params': [url, ean]
            })
        else:
            not_found += 1
    
    if statements:
        payload = {'statements': statements}
        
        try:
            response = requests.post(http_url, headers=headers, json=payload, timeout=60)
            if response.status_code == 200:
                updated += len(statements)
                if (i + batch_size) % 100 == 0:
                    print(f"   Progreso: {min(i + batch_size, len(json_data))}/{len(json_data)}")
        except Exception as e:
            print(f"   ❌ Error en batch: {str(e)}")

print(f"\n✅ Actualizados: {updated}")
print(f"⚠️  Sin URL: {not_found}")

# Verificar
print("\n🔍 Verificando...")
payload = {
    'statements': [{
        'q': 'SELECT COUNT(*) FROM core_titulos WHERE portada_cloudinary IS NOT NULL'
    }]
}

try:
    response = requests.post(http_url, headers=headers, json=payload, timeout=30)
    if response.status_code == 200:
        data = response.json()
        # Navegar por la estructura de respuesta
        count = None
        if isinstance(data, list) and len(data) > 0:
            first = data[0]
            if 'results' in first and len(first['results']) > 0:
                result = first['results'][0]
                if 'response' in result:
                    rows = result['response'].get('result', {}).get('rows', [])
                    if rows:
                        count = rows[0][0]
        
        if count is not None:
            print(f"✅ {count} libros con URL de Cloudinary")
        else:
            print("⚠️  No se pudo verificar el conteo")
except Exception as e:
    print(f"❌ Error verificando: {str(e)}")

# Mostrar muestra
print("\n📖 Muestra de libros actualizados:")
payload = {
    'statements': [{
        'q': 'SELECT EAN, Titulo, portada_cloudinary FROM core_titulos WHERE portada_cloudinary IS NOT NULL LIMIT 3'
    }]
}

try:
    response = requests.post(http_url, headers=headers, json=payload, timeout=30)
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, list) and len(data) > 0:
            first = data[0]
            if 'results' in first and len(first['results']) > 0:
                result = first['results'][0]
                if 'response' in result:
                    rows = result['response'].get('result', {}).get('rows', [])
                    for row in rows:
                        ean, titulo, url = row
                        url_short = url[:50] + '...' if len(url) > 50 else url
                        print(f"  [{ean}] {titulo}")
                        print(f"     {url_short}")
except Exception as e:
    print(f"❌ Error: {str(e)}")

print("\n" + "=" * 70)
print("🎉 COMPLETADO")
print("=" * 70)
