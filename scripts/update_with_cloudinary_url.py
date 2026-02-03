"""
Actualizar bases de datos con la URL de Cloudinary proporcionada por el usuario
"""

import sqlite3
import requests

# Configuración
LOCAL_DB = r'C:\ProyectosDjango\casateca\db.sqlite3'
TURSO_URL = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA'

# URLs
NEW_CLOUDINARY_URL = 'https://res.cloudinary.com/casateca/image/upload/v1770055485/default_book_cover_elegant_nxc8lt.png'
OLD_DEFAULT_URL = 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
OLD_PLACEHOLDER_URL = 'https://via.placeholder.com/600x800/2d3436/dfe6e9?text=SIN+PORTADA'

def update_local_db():
    """Actualizar base de datos local"""
    try:
        conn = sqlite3.connect(LOCAL_DB)
        cursor = conn.cursor()
        
        # Contar libros con cualquiera de las URLs antiguas
        cursor.execute("""
            SELECT COUNT(*) 
            FROM core_titulos 
            WHERE portada_cloudinary IN (?, ?)
        """, (OLD_DEFAULT_URL, OLD_PLACEHOLDER_URL))
        count = cursor.fetchone()[0]
        
        print(f"\n📊 Base de Datos LOCAL")
        print(f"   Libros con imagen antigua: {count}")
        
        if count > 0:
            # Actualizar ambas URLs antiguas
            cursor.execute("""
                UPDATE core_titulos 
                SET portada_cloudinary = ? 
                WHERE portada_cloudinary IN (?, ?)
            """, (NEW_CLOUDINARY_URL, OLD_DEFAULT_URL, OLD_PLACEHOLDER_URL))
            
            conn.commit()
            print(f"   ✓ Actualizados {count} libros con nueva imagen elegante")
        else:
            print(f"   ℹ No hay libros con imagen antigua")
        
        conn.close()
        return count
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        return 0

def update_turso_db():
    """Actualizar base de datos Turso"""
    try:
        sql_count = f"""
            SELECT COUNT(*) 
            FROM core_titulos 
            WHERE portada_cloudinary IN ('{OLD_DEFAULT_URL}', '{OLD_PLACEHOLDER_URL}')
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
        print(f"   Libros con imagen antigua: {count}")
        
        if count > 0:
            sql_update = f"""
                UPDATE core_titulos 
                SET portada_cloudinary = '{NEW_CLOUDINARY_URL}' 
                WHERE portada_cloudinary IN ('{OLD_DEFAULT_URL}', '{OLD_PLACEHOLDER_URL}')
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
                print(f"   ✓ Actualizados {count} libros con nueva imagen elegante")
            else:
                print(f"   ✗ Error al actualizar: {response.status_code}")
        else:
            print(f"   ℹ No hay libros con imagen antigua")
        
        return count
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        return 0

def main():
    print("=" * 60)
    print("ACTUALIZAR CON IMAGEN ELEGANTE DE CLOUDINARY")
    print("=" * 60)
    print(f"\n📸 Nueva URL de Cloudinary:")
    print(f"   {NEW_CLOUDINARY_URL}")
    
    # Actualizar bases de datos
    local_count = update_local_db()
    turso_count = update_turso_db()
    
    print("\n" + "=" * 60)
    print("RESUMEN FINAL")
    print("=" * 60)
    print(f"✓ Imagen elegante subida a Cloudinary")
    print(f"✓ Libros actualizados en LOCAL: {local_count}")
    print(f"✓ Libros actualizados en TURSO: {turso_count}")
    print(f"✓ Total de libros actualizados: {local_count + turso_count}")
    print("\n🎉 ¡Proceso completado exitosamente!")
    print("   Reinicia la aplicación para ver las nuevas imágenes")

if __name__ == "__main__":
    main()
