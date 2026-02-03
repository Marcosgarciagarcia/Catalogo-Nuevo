"""
Verificar que las actualizaciones se aplicaron correctamente en Turso
"""

import requests

TURSO_URL = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA'

NEW_CLOUDINARY_URL = 'https://res.cloudinary.com/casateca/image/upload/v1770055485/default_book_cover_elegant_nxc8lt.png'
OLD_DEFAULT_URL = 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
OLD_PLACEHOLDER_URL = 'https://via.placeholder.com/600x800/2d3436/dfe6e9?text=SIN+PORTADA'

def query_turso(sql):
    """Ejecutar query en Turso"""
    try:
        response = requests.post(
            TURSO_URL,
            headers={
                "Authorization": f"Bearer {TURSO_TOKEN}",
                "Content-Type": "application/json"
            },
            json={"statements": [sql]}
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                results = data[0].get('results', {})
                return results.get('rows', [])
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
        
        return []
    except Exception as e:
        print(f"Error: {str(e)}")
        return []

def main():
    print("=" * 60)
    print("VERIFICACIÓN DE ACTUALIZACIONES EN TURSO")
    print("=" * 60)
    
    # 1. Verificar campo portada_cloudinary
    print("\n1️⃣  Campo portada_cloudinary:")
    print("-" * 60)
    
    sql = f"""
        SELECT COUNT(*) 
        FROM core_titulos 
        WHERE portada_cloudinary = '{NEW_CLOUDINARY_URL}'
    """
    result = query_turso(sql)
    count_new = result[0][0] if result else 0
    print(f"   Libros con nueva imagen elegante: {count_new}")
    
    sql = f"""
        SELECT COUNT(*) 
        FROM core_titulos 
        WHERE portada_cloudinary IN ('{OLD_DEFAULT_URL}', '{OLD_PLACEHOLDER_URL}')
    """
    result = query_turso(sql)
    count_old = result[0][0] if result else 0
    print(f"   Libros con imagen antigua: {count_old}")
    
    # Mostrar ejemplos
    if count_old > 0:
        print("\n   ⚠️  Ejemplos de libros NO actualizados:")
        sql = f"""
            SELECT id, titulo, portada_cloudinary
            FROM core_titulos 
            WHERE portada_cloudinary IN ('{OLD_DEFAULT_URL}', '{OLD_PLACEHOLDER_URL}')
            LIMIT 5
        """
        result = query_turso(sql)
        for row in result:
            print(f"   - ID {row[0]}: {row[1]}")
            print(f"     URL: {row[2]}")
    
    # 2. Verificar campo portada
    print("\n2️⃣  Campo portada:")
    print("-" * 60)
    
    sql = f"""
        SELECT COUNT(*) 
        FROM core_titulos 
        WHERE portada = '{NEW_CLOUDINARY_URL}'
    """
    result = query_turso(sql)
    count_portada_new = result[0][0] if result else 0
    print(f"   Libros con nueva imagen elegante: {count_portada_new}")
    
    sql = """
        SELECT COUNT(*) 
        FROM core_titulos 
        WHERE portada LIKE 'media/core/sin-imagen_%'
    """
    result = query_turso(sql)
    count_sin_imagen = result[0][0] if result else 0
    print(f"   Libros con 'sin-imagen_': {count_sin_imagen}")
    
    # Mostrar ejemplos
    if count_sin_imagen > 0:
        print("\n   ⚠️  Ejemplos de libros NO actualizados:")
        sql = """
            SELECT id, titulo, portada
            FROM core_titulos 
            WHERE portada LIKE 'media/core/sin-imagen_%'
            LIMIT 5
        """
        result = query_turso(sql)
        for row in result:
            print(f"   - ID {row[0]}: {row[1]}")
            print(f"     Portada: {row[2]}")
    
    # 3. Verificar total de libros
    print("\n3️⃣  Estadísticas generales:")
    print("-" * 60)
    
    sql = "SELECT COUNT(*) FROM core_titulos"
    result = query_turso(sql)
    total = result[0][0] if result else 0
    print(f"   Total de libros en Turso: {total}")
    
    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    
    if count_old > 0 or count_sin_imagen > 0:
        print("⚠️  PROBLEMA DETECTADO:")
        print(f"   - {count_old} libros con imagen antigua en portada_cloudinary")
        print(f"   - {count_sin_imagen} libros con sin-imagen_ en portada")
        print("\n   Las actualizaciones NO se aplicaron correctamente en Turso")
    else:
        print("✓ Todas las actualizaciones se aplicaron correctamente")

if __name__ == "__main__":
    main()
