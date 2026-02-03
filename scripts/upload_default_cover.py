"""
Script para subir imagen por defecto a Cloudinary y actualizar libros sin portada
"""

import sqlite3
import requests
import json
from PIL import Image, ImageDraw, ImageFont
import io

# Configuración
LOCAL_DB = r'C:\ProyectosDjango\casateca\db.sqlite3'
TURSO_URL = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA'

# Cloudinary credentials (necesitas configurar estas)
CLOUDINARY_CLOUD_NAME = "tu_cloud_name"
CLOUDINARY_API_KEY = "tu_api_key"
CLOUDINARY_API_SECRET = "tu_api_secret"

def create_default_image():
    """Crear imagen por defecto 'Sin Portada'"""
    # Crear imagen de 600x800 con fondo gris
    img = Image.new('RGB', (600, 800), color=(200, 200, 200))
    draw = ImageDraw.Draw(img)
    
    # Dibujar borde
    draw.rectangle([(10, 10), (590, 790)], outline=(150, 150, 150), width=5)
    
    # Agregar texto "Sin Portada"
    try:
        # Intentar usar una fuente del sistema
        font_large = ImageFont.truetype("arial.ttf", 60)
        font_small = ImageFont.truetype("arial.ttf", 30)
    except:
        # Si no hay fuente disponible, usar la por defecto
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Texto principal
    text1 = "📚"
    text2 = "SIN PORTADA"
    text3 = "Imagen no disponible"
    
    # Calcular posiciones centradas
    bbox1 = draw.textbbox((0, 0), text1, font=font_large)
    bbox2 = draw.textbbox((0, 0), text2, font=font_large)
    bbox3 = draw.textbbox((0, 0), text3, font=font_small)
    
    w1, h1 = bbox1[2] - bbox1[0], bbox1[3] - bbox1[1]
    w2, h2 = bbox2[2] - bbox2[0], bbox2[3] - bbox2[1]
    w3, h3 = bbox3[2] - bbox3[0], bbox3[3] - bbox3[1]
    
    # Dibujar textos
    draw.text(((600-w1)/2, 250), text1, fill=(100, 100, 100), font=font_large)
    draw.text(((600-w2)/2, 350), text2, fill=(100, 100, 100), font=font_large)
    draw.text(((600-w3)/2, 450), text3, fill=(120, 120, 120), font=font_small)
    
    return img

def upload_to_cloudinary(image):
    """Subir imagen a Cloudinary"""
    # Convertir imagen a bytes
    img_byte_arr = io.BytesIO()
    image.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    # URL de upload de Cloudinary
    url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload"
    
    # Datos para el upload
    files = {'file': img_byte_arr}
    data = {
        'upload_preset': 'ml_default',  # O tu preset configurado
        'public_id': 'default_book_cover'
    }
    
    try:
        response = requests.post(url, files=files, data=data, auth=(CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET))
        if response.status_code == 200:
            result = response.json()
            return result['secure_url']
        else:
            print(f"Error al subir a Cloudinary: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def update_books_without_cover(default_url):
    """Actualizar libros sin portada en base de datos local"""
    try:
        conn = sqlite3.connect(LOCAL_DB)
        cursor = conn.cursor()
        
        # Encontrar libros sin portada
        cursor.execute("""
            SELECT id, titulo 
            FROM core_titulos 
            WHERE portada_cloudinary IS NULL OR portada_cloudinary = ''
        """)
        books = cursor.fetchall()
        
        print(f"\nEncontrados {len(books)} libros sin portada")
        
        if books:
            # Actualizar con la URL por defecto
            cursor.execute("""
                UPDATE core_titulos 
                SET portada_cloudinary = ? 
                WHERE portada_cloudinary IS NULL OR portada_cloudinary = ''
            """, (default_url,))
            
            conn.commit()
            print(f"✓ Actualizados {len(books)} libros en base de datos local")
            
            # Mostrar algunos ejemplos
            print("\nEjemplos de libros actualizados:")
            for i, book in enumerate(books[:5]):
                print(f"  - ID {book[0]}: {book[1]}")
            if len(books) > 5:
                print(f"  ... y {len(books) - 5} más")
        
        conn.close()
        return len(books)
    except Exception as e:
        print(f"Error al actualizar base de datos local: {str(e)}")
        return 0

def update_turso_books(default_url):
    """Actualizar libros sin portada en Turso"""
    try:
        # Primero, obtener libros sin portada
        sql_select = """
            SELECT id, titulo 
            FROM core_titulos 
            WHERE portada_cloudinary IS NULL OR portada_cloudinary = ''
        """
        
        response = requests.post(
            TURSO_URL,
            headers={
                "Authorization": f"Bearer {TURSO_TOKEN}",
                "Content-Type": "application/json"
            },
            json={"statements": [sql_select]}
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                results = data[0].get('results', {})
                books = results.get('rows', [])
                
                print(f"\nEncontrados {len(books)} libros sin portada en Turso")
                
                if books:
                    # Actualizar cada libro
                    for book in books:
                        book_id = book[0]
                        sql_update = f"""
                            UPDATE core_titulos 
                            SET portada_cloudinary = '{default_url}' 
                            WHERE id = {book_id}
                        """
                        
                        requests.post(
                            TURSO_URL,
                            headers={
                                "Authorization": f"Bearer {TURSO_TOKEN}",
                                "Content-Type": "application/json"
                            },
                            json={"statements": [sql_update]}
                        )
                    
                    print(f"✓ Actualizados {len(books)} libros en Turso")
                    
                    # Mostrar algunos ejemplos
                    print("\nEjemplos de libros actualizados en Turso:")
                    for i, book in enumerate(books[:5]):
                        print(f"  - ID {book[0]}: {book[1]}")
                    if len(books) > 5:
                        print(f"  ... y {len(books) - 5} más")
                    
                    return len(books)
        
        return 0
    except Exception as e:
        print(f"Error al actualizar Turso: {str(e)}")
        return 0

def main():
    print("=" * 60)
    print("ACTUALIZACIÓN DE PORTADAS POR DEFECTO")
    print("=" * 60)
    
    print("\n1. Creando imagen por defecto...")
    default_image = create_default_image()
    print("✓ Imagen creada")
    
    # Guardar localmente para verificar
    default_image.save("default_book_cover.png")
    print("✓ Imagen guardada como 'default_book_cover.png'")
    
    print("\n2. Subiendo a Cloudinary...")
    print("\n⚠️  NOTA: Necesitas configurar tus credenciales de Cloudinary")
    print("   en las variables CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY")
    print("   y CLOUDINARY_API_SECRET al inicio del script.")
    print("\n   Por ahora, usaremos una URL de ejemplo.")
    
    # URL de ejemplo (reemplazar con la real después de subir)
    default_url = "https://res.cloudinary.com/tu_cloud/image/upload/v1/default_book_cover.png"
    
    # Descomentar cuando tengas las credenciales:
    # default_url = upload_to_cloudinary(default_image)
    # if not default_url:
    #     print("✗ No se pudo subir la imagen a Cloudinary")
    #     return
    
    print(f"\n✓ URL de imagen por defecto: {default_url}")
    
    print("\n3. Actualizando base de datos local...")
    local_count = update_books_without_cover(default_url)
    
    print("\n4. Actualizando Turso...")
    turso_count = update_turso_books(default_url)
    
    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"Libros actualizados en Local: {local_count}")
    print(f"Libros actualizados en Turso: {turso_count}")
    print("\n✓ Proceso completado")

if __name__ == "__main__":
    main()
