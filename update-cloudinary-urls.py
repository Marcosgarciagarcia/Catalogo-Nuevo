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

# Convertir URL de libsql:// a https://
http_url = TURSO_URL.replace('libsql://', 'https://')

def execute_turso_sql(sql, params=None):
    """Ejecutar SQL en Turso usando HTTP API"""
    headers = {
        'Authorization': f'Bearer {TURSO_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'statements': [
            {
                'q': sql,
                'params': params or []
            }
        ]
    }
    
    try:
        response = requests.post(http_url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ Error HTTP: {str(e)}")
        return None

print("=" * 70)
print("ACTUALIZACIÓN DE URLS DE CLOUDINARY EN TURSO")
print("=" * 70)

# Paso 1: Añadir nuevo campo a la tabla
print("\n📋 Paso 1: Añadiendo campo 'portada_cloudinary' a tabla core_titulos...")

result = execute_turso_sql("""
    ALTER TABLE core_titulos 
    ADD COLUMN portada_cloudinary TEXT
""")

if result:
    print("✅ Campo 'portada_cloudinary' añadido exitosamente")
else:
    print("⚠️  El campo podría ya existir, continuando...")

# Paso 2: Leer JSON con URLs de Cloudinary
print("\n📖 Paso 2: Leyendo JSON con URLs de Cloudinary...")

try:
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        json_data = json.load(f)
    print(f"✅ Leídos {len(json_data)} registros del JSON")
except Exception as e:
    print(f"❌ Error leyendo JSON: {str(e)}")
    sys.exit(1)

# Paso 3: Crear diccionario EAN -> URL de Cloudinary
print("\n🔗 Paso 3: Creando mapeo EAN -> URL Cloudinary...")

ean_to_cloudinary = {}
for libro in json_data:
    ean = libro.get('EAN')
    portada = libro.get('portada', {})
    url = portada.get('url') if isinstance(portada, dict) else None
    
    if ean and url:
        ean_to_cloudinary[ean] = url

print(f"✅ Mapeados {len(ean_to_cloudinary)} libros con URLs de Cloudinary")

# Paso 4: Obtener libros de Turso
print("\n📚 Paso 4: Obteniendo libros de Turso...")

result = execute_turso_sql("SELECT id, EAN FROM core_titulos WHERE EAN IS NOT NULL")

if not result:
    print("❌ Error obteniendo libros de Turso - Sin respuesta")
    sys.exit(1)

# Debug: ver estructura de la respuesta
# print(f"DEBUG: Estructura de respuesta: {json.dumps(result, indent=2)[:500]}")

libros_turso = []
try:
    # Manejar diferentes estructuras de respuesta
    rows = []
    
    if isinstance(result, list):
        # Si result es una lista directamente
        if len(result) > 0 and isinstance(result[0], dict):
            first_item = result[0]
            if 'results' in first_item:
                # Estructura: [{results: [{response: {result: {rows: [...]}}}]}]
                nested_results = first_item['results']
                if nested_results and isinstance(nested_results[0], dict):
                    if 'response' in nested_results[0]:
                        rows = nested_results[0].get('response', {}).get('result', {}).get('rows', [])
                    elif 'rows' in nested_results[0]:
                        rows = nested_results[0]['rows']
            elif 'response' in first_item:
                rows = first_item.get('response', {}).get('result', {}).get('rows', [])
            elif 'rows' in first_item:
                rows = first_item['rows']
    elif isinstance(result, dict):
        if 'results' in result:
            first_result = result['results'][0] if result['results'] else {}
            if isinstance(first_result, dict):
                if 'response' in first_result:
                    rows = first_result.get('response', {}).get('result', {}).get('rows', [])
                elif 'rows' in first_result:
                    rows = first_result['rows']
    
    if not rows:
        print(f"❌ No se pudieron obtener filas")
        print(f"   Tipo de result: {type(result)}")
        if isinstance(result, dict):
            print(f"   Claves: {list(result.keys())}")
        elif isinstance(result, list) and len(result) > 0:
            print(f"   Primer elemento: {type(result[0])}")
            if isinstance(result[0], dict):
                print(f"   Claves del primer elemento: {list(result[0].keys())}")
        sys.exit(1)
    
    for row in rows:
        libros_turso.append({
            'id': row[0],
            'ean': row[1]
        })
    print(f"✅ Obtenidos {len(libros_turso)} libros de Turso")
    
except Exception as e:
    print(f"❌ Error procesando resultados: {str(e)}")
    print(f"   Tipo de error: {type(e).__name__}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Paso 5: Actualizar URLs en Turso
print("\n💾 Paso 5: Actualizando URLs de Cloudinary en Turso...")

updated = 0
not_found = 0
errors = 0

# Actualizar en lotes
batch_size = 50
total = len(libros_turso)

for i in range(0, total, batch_size):
    batch = libros_turso[i:i+batch_size]
    statements = []
    
    for libro in batch:
        libro_id = libro['id']
        ean = libro['ean']
        
        # Buscar URL en el mapeo
        cloudinary_url = ean_to_cloudinary.get(ean)
        
        if cloudinary_url:
            statements.append({
                'q': "UPDATE core_titulos SET portada_cloudinary = ? WHERE id = ?",
                'params': [cloudinary_url, libro_id]
            })
        else:
            not_found += 1
    
    if statements:
        # Ejecutar batch
        headers = {
            'Authorization': f'Bearer {TURSO_TOKEN}',
            'Content-Type': 'application/json'
        }
        
        payload = {'statements': statements}
        
        try:
            response = requests.post(http_url, headers=headers, json=payload, timeout=60)
            
            if response.status_code == 200:
                updated += len(statements)
                if (i + batch_size) % 200 == 0:
                    print(f"   Progreso: {min(i + batch_size, total)}/{total} ({round(min(i + batch_size, total) / total * 100)}%)")
            else:
                errors += len(statements)
                print(f"   ❌ Error en batch: {response.status_code}")
        
        except Exception as e:
            errors += len(statements)
            print(f"   ❌ Error: {str(e)}")

print("\n" + "=" * 70)
print("RESUMEN DE ACTUALIZACIÓN")
print("=" * 70)

print(f"\n📊 Estadísticas:")
print(f"   Total de libros en Turso: {total}")
print(f"   ✅ URLs actualizadas: {updated}")
print(f"   ⚠️  Sin URL en JSON: {not_found}")
print(f"   ❌ Errores: {errors}")

# Paso 6: Verificar actualización
print("\n" + "=" * 70)
print("VERIFICACIÓN")
print("=" * 70)

print("\n🔍 Verificando actualización...")

# Contar registros con portada_cloudinary
result = execute_turso_sql("""
    SELECT COUNT(*) as total 
    FROM core_titulos 
    WHERE portada_cloudinary IS NOT NULL
""")

if result and 'results' in result:
    count_with_url = result['results'][0]['rows'][0][0]
    print(f"✅ Libros con URL de Cloudinary: {count_with_url}")

# Mostrar muestra de libros actualizados
print("\n📖 Muestra de libros actualizados:")

result = execute_turso_sql("""
    SELECT id, EAN, Titulo, portada_cloudinary 
    FROM core_titulos 
    WHERE portada_cloudinary IS NOT NULL 
    LIMIT 5
""")

if result and 'results' in result:
    for row in result['results'][0]['rows']:
        libro_id, ean, titulo, url = row
        url_short = url[:60] + '...' if len(url) > 60 else url
        print(f"  {libro_id}. [{ean}] {titulo}")
        print(f"     URL: {url_short}")

# Mostrar libros sin URL
result = execute_turso_sql("""
    SELECT COUNT(*) as total 
    FROM core_titulos 
    WHERE portada_cloudinary IS NULL
""")

if result and 'results' in result:
    count_without_url = result['results'][0]['rows'][0][0]
    print(f"\n⚠️  Libros sin URL de Cloudinary: {count_without_url}")
    
    if count_without_url > 0:
        print("\n📋 Primeros 5 libros sin URL:")
        result = execute_turso_sql("""
            SELECT id, EAN, Titulo 
            FROM core_titulos 
            WHERE portada_cloudinary IS NULL 
            LIMIT 5
        """)
        
        if result and 'results' in result:
            for row in result['results'][0]['rows']:
                libro_id, ean, titulo = row
                print(f"  {libro_id}. [{ean}] {titulo}")

print("\n" + "=" * 70)
print("🎉 ACTUALIZACIÓN COMPLETADA")
print("=" * 70)

print(f"""
✅ Campo 'portada_cloudinary' añadido a tabla core_titulos
✅ URLs de Cloudinary actualizadas desde JSON
📊 {updated} libros actualizados exitosamente

🔗 Base de datos en Turso:
   {TURSO_URL}

📝 Próximos pasos:
   1. Verificar datos en el dashboard de Turso
   2. Adaptar el frontend para usar el campo 'portada_cloudinary'
   3. Probar la aplicación con las nuevas URLs
""")
