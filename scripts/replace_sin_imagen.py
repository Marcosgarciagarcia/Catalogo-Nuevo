"""
Reemplazar imágenes 'sin-imagen_*' con la nueva imagen elegante de Cloudinary
y eliminar las imágenes antiguas de Cloudinary
"""

import sqlite3
import requests
import re

# Configuración
LOCAL_DB = r'C:\ProyectosDjango\casateca\db.sqlite3'
TURSO_URL = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA'

# Cloudinary config
CLOUDINARY_CLOUD_NAME = "dxvl3o4vq"
CLOUDINARY_API_KEY = "YOUR_API_KEY"  # Necesitarás proporcionarlo
CLOUDINARY_API_SECRET = "YOUR_API_SECRET"  # Necesitarás proporcionarlo

NEW_CLOUDINARY_URL = 'https://res.cloudinary.com/casateca/image/upload/v1770055485/default_book_cover_elegant_nxc8lt.png'

def get_books_with_sin_imagen_local():
    """Obtener libros con portada sin-imagen de base de datos local"""
    try:
        conn = sqlite3.connect(LOCAL_DB)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, titulo, portada
            FROM core_titulos 
            WHERE portada LIKE 'media/core/sin-imagen_%'
        """)
        books = cursor.fetchall()
        
        conn.close()
        return books
    except Exception as e:
        print(f"✗ Error al consultar LOCAL: {str(e)}")
        return []

def get_books_with_sin_imagen_turso():
    """Obtener libros con portada sin-imagen de Turso"""
    try:
        sql = """
            SELECT id, titulo, portada
            FROM core_titulos 
            WHERE portada LIKE 'media/core/sin-imagen_%'
        """
        
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
                rows = results.get('rows', [])
                return rows
        
        return []
    except Exception as e:
        print(f"✗ Error al consultar TURSO: {str(e)}")
        return []

def extract_public_ids(books):
    """Extraer public_ids de Cloudinary de las URLs de portada"""
    public_ids = set()
    
    for book in books:
        portada = book[2]  # Campo portada
        if portada and 'cloudinary.com' in portada:
            # Extraer public_id de URL de Cloudinary
            # Ejemplo: https://res.cloudinary.com/xxx/image/upload/v123/folder/image.jpg
            match = re.search(r'/upload/(?:v\d+/)?(.+?)(?:\.\w+)?$', portada)
            if match:
                public_ids.add(match.group(1))
    
    return list(public_ids)

def update_local_db():
    """Actualizar base de datos local"""
    try:
        conn = sqlite3.connect(LOCAL_DB)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT COUNT(*) 
            FROM core_titulos 
            WHERE portada LIKE 'media/core/sin-imagen_%'
        """)
        count = cursor.fetchone()[0]
        
        print(f"\n📊 Base de Datos LOCAL")
        print(f"   Libros con 'sin-imagen_': {count}")
        
        if count > 0:
            cursor.execute("""
                UPDATE core_titulos 
                SET portada = ? 
                WHERE portada LIKE 'media/core/sin-imagen_%'
            """, (NEW_CLOUDINARY_URL,))
            
            conn.commit()
            print(f"   ✓ Actualizados {count} libros")
        else:
            print(f"   ℹ No hay libros con 'sin-imagen_'")
        
        conn.close()
        return count
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        return 0

def update_turso_db():
    """Actualizar base de datos Turso"""
    try:
        sql_count = """
            SELECT COUNT(*) 
            FROM core_titulos 
            WHERE portada LIKE 'media/core/sin-imagen_%'
        """
        
        response = requests.post(
            TURSO_URL,
            headers={
                "Authorization": f"Bearer {TURSO_TOKEN}",
                "Content-Type": "application/json"
            },
            json={"statements": [sql_count]}
        )
        
        count = 0
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                results = data[0].get('results', {})
                rows = results.get('rows', [])
                if rows and len(rows) > 0:
                    count = rows[0][0]
        
        print(f"\n📊 Base de Datos TURSO")
        print(f"   Libros con 'sin-imagen_': {count}")
        
        if count > 0:
            sql_update = f"""
                UPDATE core_titulos 
                SET portada = '{NEW_CLOUDINARY_URL}' 
                WHERE portada LIKE 'media/core/sin-imagen_%'
            """
            
            response = requests.post(
                TURSO_URL,
                headers={
                    "Authorization": f"Bearer {TURSO_TOKEN}",
                    "Content-Type": "application/json"
                },
                json={"statements": [sql_update]}
            )
            
            if response.status_code == 200:
                print(f"   ✓ Actualizados {count} libros")
            else:
                print(f"   ✗ Error al actualizar: {response.status_code}")
        else:
            print(f"   ℹ No hay libros con 'sin-imagen_'")
        
        return count
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        return 0

def delete_from_cloudinary(public_ids):
    """Eliminar imágenes de Cloudinary"""
    if not public_ids:
        print("\n📁 No hay imágenes para eliminar de Cloudinary")
        return 0
    
    print(f"\n🗑️  Eliminando {len(public_ids)} imágenes de Cloudinary...")
    
    if CLOUDINARY_API_KEY == "YOUR_API_KEY":
        print("\n⚠️  ADVERTENCIA: No se han configurado las credenciales de Cloudinary")
        print("   Para eliminar imágenes, necesitas:")
        print("   1. API Key")
        print("   2. API Secret")
        print("\n   Las imágenes NO se eliminarán automáticamente.")
        print("   Puedes eliminarlas manualmente desde el dashboard de Cloudinary:")
        for pid in public_ids[:5]:
            print(f"   - {pid}")
        if len(public_ids) > 5:
            print(f"   ... y {len(public_ids) - 5} más")
        return 0
    
    deleted_count = 0
    url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/resources/image/upload"
    
    for public_id in public_ids:
        try:
            response = requests.delete(
                f"{url}/{public_id}",
                auth=(CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)
            )
            
            if response.status_code == 200:
                deleted_count += 1
                print(f"   ✓ Eliminado: {public_id}")
            else:
                print(f"   ✗ Error al eliminar {public_id}: {response.status_code}")
        except Exception as e:
            print(f"   ✗ Error: {str(e)}")
    
    return deleted_count

def main():
    print("=" * 60)
    print("REEMPLAZAR IMÁGENES 'SIN-IMAGEN_*'")
    print("=" * 60)
    
    # Obtener libros con sin-imagen
    print("\n🔍 Buscando libros con 'sin-imagen_'...")
    
    local_books = get_books_with_sin_imagen_local()
    turso_books = get_books_with_sin_imagen_turso()
    
    print(f"\n   Encontrados en LOCAL: {len(local_books)}")
    print(f"   Encontrados en TURSO: {len(turso_books)}")
    
    # Mostrar algunos ejemplos
    if local_books:
        print("\n   Ejemplos de libros a actualizar:")
        for i, book in enumerate(local_books[:3]):
            print(f"   - ID {book[0]}: {book[1]}")
            print(f"     Portada actual: {book[2]}")
        if len(local_books) > 3:
            print(f"   ... y {len(local_books) - 3} más")
    
    # Extraer public_ids para eliminar de Cloudinary
    all_books = local_books + turso_books
    public_ids = extract_public_ids(all_books)
    
    print(f"\n📸 Nueva URL de Cloudinary:")
    print(f"   {NEW_CLOUDINARY_URL}")
    
    # Actualizar bases de datos
    local_count = update_local_db()
    turso_count = update_turso_db()
    
    # Eliminar imágenes antiguas de Cloudinary
    deleted_count = delete_from_cloudinary(public_ids)
    
    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"✓ Libros actualizados en LOCAL: {local_count}")
    print(f"✓ Libros actualizados en TURSO: {turso_count}")
    print(f"✓ Total de libros actualizados: {local_count + turso_count}")
    print(f"✓ Imágenes eliminadas de Cloudinary: {deleted_count}")
    print("\n🎉 ¡Proceso completado!")

if __name__ == "__main__":
    main()
