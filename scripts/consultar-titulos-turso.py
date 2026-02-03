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

def query_turso(sql):
    """Ejecutar query y extraer resultados"""
    payload = {'statements': [{'q': sql}]}
    
    try:
        response = requests.post(http_url, headers=headers, json=payload, timeout=30)
        if response.status_code == 200:
            data = response.json()
            # Extraer rows de la estructura de Turso
            if isinstance(data, list) and len(data) > 0:
                results = data[0].get('results', {})
                return results.get('rows', []), results.get('columns', [])
        return [], []
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return [], []

print("=" * 80)
print("CONSULTA DE TÍTULOS EN TURSO")
print("=" * 80)

# 1. Contar total de libros
print("\n📊 ESTADÍSTICAS GENERALES:")
print("-" * 80)

rows, _ = query_turso("SELECT COUNT(*) FROM core_titulos")
if rows:
    print(f"  Total de libros: {rows[0][0]}")

rows, _ = query_turso("SELECT COUNT(*) FROM core_titulos WHERE portada_cloudinary IS NOT NULL")
if rows:
    print(f"  Con URL Cloudinary: {rows[0][0]}")

rows, _ = query_turso("SELECT COUNT(*) FROM core_autores")
if rows:
    print(f"  Total de autores: {rows[0][0]}")

rows, _ = query_turso("SELECT COUNT(*) FROM core_editoriales")
if rows:
    print(f"  Total de editoriales: {rows[0][0]}")

# 2. Mostrar primeros 20 libros
print("\n📚 PRIMEROS 20 LIBROS:")
print("-" * 80)

rows, cols = query_turso("""
    SELECT 
        t.id,
        t.EAN,
        t.Titulo,
        a.nombreAutor,
        e.Editorial,
        t.AnoPublicacion,
        t.portada_cloudinary
    FROM core_titulos t
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    ORDER BY t.id
    LIMIT 20
""")

if rows:
    for row in rows:
        libro_id, ean, titulo, autor, editorial, ano, url = row
        has_url = "🖼️" if url else "  "
        titulo_short = titulo[:60] + '...' if len(titulo) > 60 else titulo
        autor_short = (autor[:30] + '...' if autor and len(autor) > 30 else autor) or 'N/A'
        
        print(f"\n{has_url} {libro_id}. {titulo_short}")
        print(f"     EAN: {ean}")
        print(f"     Autor: {autor_short}")
        print(f"     Editorial: {editorial or 'N/A'}")
        print(f"     Año: {ano or 'N/A'}")
else:
    print("  ❌ No se pudieron obtener libros")

# 3. Buscar libros por palabra clave
print("\n" + "=" * 80)
print("🔍 BÚSQUEDA DE EJEMPLO: Libros con 'Harry' en el título")
print("-" * 80)

rows, _ = query_turso("""
    SELECT 
        t.id,
        t.Titulo,
        a.nombreAutor,
        t.portada_cloudinary
    FROM core_titulos t
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    WHERE t.Titulo LIKE '%Harry%'
    LIMIT 10
""")

if rows:
    for row in rows:
        libro_id, titulo, autor, url = row
        has_url = "✅" if url else "❌"
        print(f"  {has_url} {libro_id}. {titulo}")
        print(f"     Autor: {autor or 'N/A'}")
else:
    print("  No se encontraron resultados")

# 4. Libros más recientes
print("\n" + "=" * 80)
print("📅 LIBROS MÁS RECIENTES (por año de publicación)")
print("-" * 80)

rows, _ = query_turso("""
    SELECT 
        t.Titulo,
        a.nombreAutor,
        t.AnoPublicacion,
        t.portada_cloudinary
    FROM core_titulos t
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    WHERE t.AnoPublicacion IS NOT NULL
    ORDER BY t.AnoPublicacion DESC
    LIMIT 10
""")

if rows:
    for row in rows:
        titulo, autor, ano, url = row
        has_url = "🖼️" if url else "  "
        titulo_short = titulo[:50] + '...' if len(titulo) > 50 else titulo
        print(f"  {has_url} [{ano}] {titulo_short}")
        print(f"     {autor or 'N/A'}")
else:
    print("  No se encontraron resultados")

# 5. Autores con más libros
print("\n" + "=" * 80)
print("👤 TOP 10 AUTORES CON MÁS LIBROS")
print("-" * 80)

rows, _ = query_turso("""
    SELECT 
        a.nombreAutor,
        COUNT(*) as total
    FROM core_titulos t
    JOIN core_autores a ON t.codiAutor_id = a.id
    GROUP BY a.nombreAutor
    ORDER BY total DESC
    LIMIT 10
""")

if rows:
    for i, row in enumerate(rows, 1):
        autor, total = row
        print(f"  {i:2}. {autor:40} | {total:3} libros")
else:
    print("  No se encontraron resultados")

print("\n" + "=" * 80)
print("✅ CONSULTA COMPLETADA")
print("=" * 80)

print(f"""
🔗 Base de datos: {TURSO_URL}

💡 Ahora puedes:
   1. Ver los datos en el dashboard de Turso (refresca la página)
   2. Ejecutar tus propias consultas SQL
   3. Adaptar el frontend para usar estos datos

📝 Ejemplo de query para el frontend:
   SELECT t.id, t.EAN, t.Titulo, a.nombreAutor, t.portada_cloudinary
   FROM core_titulos t
   LEFT JOIN core_autores a ON t.codiAutor_id = a.id
   ORDER BY t.Titulo
""")
