import os
import sys
import requests
import json

# Configuración
TURSO_URL = os.getenv('TURSO_DATABASE_URL')
TURSO_TOKEN = os.getenv('TURSO_AUTH_TOKEN')

if not TURSO_URL or not TURSO_TOKEN:
    print("❌ Error: Faltan credenciales de Turso")
    sys.exit(1)

http_url = TURSO_URL.replace('libsql://', 'https://')

def query_turso(sql):
    """Ejecutar query en Turso y devolver resultados"""
    headers = {
        'Authorization': f'Bearer {TURSO_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'statements': [{
            'q': sql
        }]
    }
    
    try:
        response = requests.post(http_url, headers=headers, json=payload, timeout=30)
        if response.status_code == 200:
            data = response.json()
            # Navegar estructura de respuesta
            if isinstance(data, list) and len(data) > 0:
                first = data[0]
                if 'results' in first and len(first['results']) > 0:
                    result = first['results'][0]
                    if 'response' in result:
                        return result['response'].get('result', {})
            return None
        else:
            print(f"❌ Error HTTP: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

print("=" * 70)
print("VERIFICACIÓN DE DATOS EN TURSO")
print("=" * 70)

print(f"\n🔗 Conectando a: {TURSO_URL}\n")

# 1. Listar todas las tablas
print("📋 TABLAS EN LA BASE DE DATOS:")
print("-" * 70)

result = query_turso("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")

if result and 'rows' in result:
    tables = [row[0] for row in result['rows']]
    for i, table in enumerate(tables, 1):
        print(f"  {i}. {table}")
    print(f"\n✅ Total de tablas: {len(tables)}")
else:
    print("❌ No se pudieron obtener las tablas")
    sys.exit(1)

# 2. Contar registros en cada tabla
print("\n📊 REGISTROS POR TABLA:")
print("-" * 70)

total_records = 0
table_stats = []

for table in tables:
    result = query_turso(f"SELECT COUNT(*) FROM {table}")
    if result and 'rows' in result:
        count = result['rows'][0][0]
        total_records += count
        table_stats.append((table, count))
        if count > 0:
            print(f"  {table:35} | {count:6} registros")

print("-" * 70)
print(f"  {'TOTAL':35} | {total_records:6} registros")

# 3. Verificar tabla core_titulos específicamente
print("\n📚 DETALLES DE TABLA 'core_titulos':")
print("-" * 70)

result = query_turso("SELECT COUNT(*) FROM core_titulos")
if result and 'rows' in result:
    total_titulos = result['rows'][0][0]
    print(f"  Total de libros: {total_titulos}")

result = query_turso("SELECT COUNT(*) FROM core_titulos WHERE portada_cloudinary IS NOT NULL")
if result and 'rows' in result:
    with_cloudinary = result['rows'][0][0]
    print(f"  Con URL Cloudinary: {with_cloudinary}")

result = query_turso("SELECT COUNT(*) FROM core_titulos WHERE EAN IS NOT NULL")
if result and 'rows' in result:
    with_ean = result['rows'][0][0]
    print(f"  Con EAN: {with_ean}")

# 4. Mostrar muestra de libros
print("\n📖 MUESTRA DE 10 LIBROS:")
print("-" * 70)

result = query_turso("""
    SELECT id, EAN, Titulo, portada_cloudinary 
    FROM core_titulos 
    LIMIT 10
""")

if result and 'rows' in result:
    for row in result['rows']:
        libro_id, ean, titulo, url = row
        has_url = "✅" if url else "❌"
        titulo_short = titulo[:50] + '...' if len(titulo) > 50 else titulo
        print(f"  {has_url} [{ean}] {titulo_short}")
else:
    print("  ❌ No se pudieron obtener libros")

# 5. Verificar autores
print("\n👤 AUTORES:")
print("-" * 70)

result = query_turso("SELECT COUNT(*) FROM core_autores")
if result and 'rows' in result:
    total_autores = result['rows'][0][0]
    print(f"  Total de autores: {total_autores}")

result = query_turso("SELECT id, nombreAutor FROM core_autores LIMIT 5")
if result and 'rows' in result:
    print("\n  Muestra:")
    for row in result['rows']:
        print(f"    {row[0]}. {row[1]}")

# 6. Verificar editoriales
print("\n🏢 EDITORIALES:")
print("-" * 70)

result = query_turso("SELECT COUNT(*) FROM core_editoriales")
if result and 'rows' in result:
    total_editoriales = result['rows'][0][0]
    print(f"  Total de editoriales: {total_editoriales}")

result = query_turso("SELECT id, Editorial FROM core_editoriales LIMIT 5")
if result and 'rows' in result:
    print("\n  Muestra:")
    for row in result['rows']:
        print(f"    {row[0]}. {row[1]}")

# 7. Query de ejemplo para el frontend
print("\n" + "=" * 70)
print("💡 QUERY DE EJEMPLO PARA EL FRONTEND")
print("=" * 70)

result = query_turso("""
    SELECT 
        t.id,
        t.EAN,
        t.Titulo,
        a.nombreAutor as autor,
        e.Editorial as editorial,
        t.AnoPublicacion,
        t.portada_cloudinary
    FROM core_titulos t
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    LIMIT 5
""")

if result and 'rows' in result:
    print("\nResultado de JOIN (títulos con autor y editorial):\n")
    for row in result['rows']:
        libro_id, ean, titulo, autor, editorial, ano, url = row
        print(f"  📚 {titulo}")
        print(f"     Autor: {autor or 'N/A'}")
        print(f"     Editorial: {editorial or 'N/A'}")
        print(f"     Año: {ano or 'N/A'}")
        print(f"     URL: {'✅ Sí' if url else '❌ No'}")
        print()

print("=" * 70)
print("✅ VERIFICACIÓN COMPLETADA")
print("=" * 70)

print(f"""
📊 Resumen:
   - Tablas: {len(tables)}
   - Registros totales: {total_records}
   - Libros: {total_titulos if 'total_titulos' in locals() else 'N/A'}
   - Con imágenes Cloudinary: {with_cloudinary if 'with_cloudinary' in locals() else 'N/A'}

🔗 Base de datos: {TURSO_URL}

💡 Los datos están en Turso. Si el dashboard muestra 0 registros,
   intenta refrescar la página o seleccionar una tabla específica.
""")
