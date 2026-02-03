"""
Actualizar libros que tienen imágenes sin-imagen_*.webp en Cloudinary
"""

import sqlite3
import requests

LOCAL_DB = r'C:\ProyectosDjango\casateca\db.sqlite3'
TURSO_URL = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA'

NEW_CLOUDINARY_URL = 'https://res.cloudinary.com/casateca/image/upload/v1770055485/default_book_cover_elegant_nxc8lt.png'

def update_local_db():
    """Actualizar base de datos local"""
    try:
        conn = sqlite3.connect(LOCAL_DB)
        cursor = conn.cursor()
        
        # Buscar URLs de Cloudinary que contengan sin-imagen_
        cursor.execute("""
            SELECT COUNT(*) 
            FROM core_titulos 
            WHERE portada_cloudinary LIKE '%sin-imagen_%'
        """)
        count = cursor.fetchone()[0]
        
        print(f"\n📊 Base de Datos LOCAL")
        print(f"   Libros con 'sin-imagen_' en Cloudinary: {count}")
        
        if count > 0:
            cursor.execute("""
                UPDATE core_titulos 
                SET portada_cloudinary = ? 
                WHERE portada_cloudinary LIKE '%sin-imagen_%'
            """, (NEW_CLOUDINARY_URL,))
            
            conn.commit()
            print(f"   ✓ Actualizados {count} libros")
        
        conn.close()
        return count
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        return 0

def update_turso_db():
    """Actualizar base de datos Turso"""
    try:
        # Contar
        sql_count = """
            SELECT COUNT(*) 
            FROM core_titulos 
            WHERE portada_cloudinary LIKE '%sin-imagen_%'
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
        print(f"   Libros con 'sin-imagen_' en Cloudinary: {count}")
        
        if count > 0:
            # Obtener IDs para actualizar uno por uno
            sql_get = """
                SELECT id, titulo, portada_cloudinary
                FROM core_titulos 
                WHERE portada_cloudinary LIKE '%sin-imagen_%'
            """
            
            response = requests.post(
                TURSO_URL,
                headers={
                    "Authorization": f"Bearer {TURSO_TOKEN}",
                    "Content-Type": "application/json"
                },
                json={"statements": [sql_get]}
            )
            
            books = []
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    results = data[0].get('results', {})
                    books = results.get('rows', [])
            
            print(f"\n   Actualizando {len(books)} libros...")
            
            # Actualizar en lote
            update_statements = []
            for book in books:
                book_id = book[0]
                sql_update = f"""
                    UPDATE core_titulos 
                    SET portada_cloudinary = '{NEW_CLOUDINARY_URL}' 
                    WHERE id = {book_id}
                """
                update_statements.append(sql_update)
            
            # Ejecutar en lotes de 50
            batch_size = 50
            updated = 0
            for i in range(0, len(update_statements), batch_size):
                batch = update_statements[i:i+batch_size]
                
                response = requests.post(
                    TURSO_URL,
                    headers={
                        "Authorization": f"Bearer {TURSO_TOKEN}",
                        "Content-Type": "application/json"
                    },
                    json={"statements": batch}
                )
                
                if response.status_code == 200:
                    updated += len(batch)
                    print(f"   Procesados {updated}/{len(books)}...")
            
            print(f"   ✓ Actualizados {updated} libros")
            return updated
        
        return 0
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        return 0

def main():
    print("=" * 60)
    print("ACTUALIZAR IMÁGENES 'SIN-IMAGEN_' EN CLOUDINARY")
    print("=" * 60)
    print(f"\nNueva URL: {NEW_CLOUDINARY_URL}")
    
    local_count = update_local_db()
    turso_count = update_turso_db()
    
    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"✓ Libros actualizados en LOCAL: {local_count}")
    print(f"✓ Libros actualizados en TURSO: {turso_count}")
    print(f"✓ Total: {local_count + turso_count}")
    print("\n🎉 ¡Proceso completado!")

if __name__ == "__main__":
    main()
