"""
Script para actualizar libros sin portada con URL de imagen por defecto
"""

import sqlite3
import requests

# Configuración
LOCAL_DB = r'C:\ProyectosDjango\casateca\db.sqlite3'
TURSO_URL = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA'

# URL de imagen por defecto (puedes cambiarla por tu imagen en Cloudinary)
DEFAULT_IMAGE_URL = 'https://res.cloudinary.com/demo/image/upload/sample.jpg'

def update_local_db():
    """Actualizar base de datos local"""
    try:
        conn = sqlite3.connect(LOCAL_DB)
        cursor = conn.cursor()
        
        # Contar libros sin portada
        cursor.execute("""
            SELECT COUNT(*) 
            FROM core_titulos 
            WHERE portada_cloudinary IS NULL OR portada_cloudinary = ''
        """)
        count_before = cursor.fetchone()[0]
        
        print(f"\n📊 Base de Datos LOCAL")
        print(f"   Libros sin portada: {count_before}")
        
        if count_before > 0:
            # Actualizar con la URL por defecto
            cursor.execute("""
                UPDATE core_titulos 
                SET portada_cloudinary = ? 
                WHERE portada_cloudinary IS NULL OR portada_cloudinary = ''
            """, (DEFAULT_IMAGE_URL,))
            
            conn.commit()
            print(f"   ✓ Actualizados {count_before} libros")
        else:
            print(f"   ✓ Todos los libros ya tienen portada")
        
        conn.close()
        return count_before
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        return 0

def update_turso_db():
    """Actualizar base de datos Turso"""
    try:
        # Primero, contar libros sin portada
        sql_count = """
            SELECT COUNT(*) 
            FROM core_titulos 
            WHERE portada_cloudinary IS NULL OR portada_cloudinary = ''
        """
        
        response = requests.post(
            TURSO_URL,
            headers={
                "Authorization": f"Bearer {TURSO_TOKEN}",
                "Content-Type": "application/json"
            },
            json={"statements": [sql_count]}
        )
        
        count_before = 0
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                results = data[0].get('results', {})
                rows = results.get('rows', [])
                if rows and len(rows) > 0:
                    count_before = rows[0][0]
        
        print(f"\n📊 Base de Datos TURSO")
        print(f"   Libros sin portada: {count_before}")
        
        if count_before > 0:
            # Actualizar con la URL por defecto
            sql_update = f"""
                UPDATE core_titulos 
                SET portada_cloudinary = '{DEFAULT_IMAGE_URL}' 
                WHERE portada_cloudinary IS NULL OR portada_cloudinary = ''
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
                print(f"   ✓ Actualizados {count_before} libros")
            else:
                print(f"   ✗ Error al actualizar: {response.status_code}")
        else:
            print(f"   ✓ Todos los libros ya tienen portada")
        
        return count_before
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        return 0

def main():
    print("=" * 60)
    print("ACTUALIZACIÓN DE PORTADAS POR DEFECTO")
    print("=" * 60)
    print(f"\nURL de imagen por defecto: {DEFAULT_IMAGE_URL}")
    
    local_count = update_local_db()
    turso_count = update_turso_db()
    
    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"Total actualizado en LOCAL: {local_count}")
    print(f"Total actualizado en TURSO: {turso_count}")
    print(f"Total general: {local_count + turso_count}")
    print("\n✓ Proceso completado")

if __name__ == "__main__":
    main()
