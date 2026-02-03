"""
Crear una mejor imagen por defecto para libros sin portada
"""

from PIL import Image, ImageDraw, ImageFont
import sqlite3
import requests

# Configuración
LOCAL_DB = r'C:\ProyectosDjango\casateca\db.sqlite3'
TURSO_URL = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA'

OLD_DEFAULT_URL = 'https://res.cloudinary.com/demo/image/upload/sample.jpg'

def create_elegant_book_cover():
    """Crear una portada elegante para libros sin imagen"""
    # Crear imagen de 600x800 con degradado
    img = Image.new('RGB', (600, 800), color=(45, 52, 54))
    draw = ImageDraw.Draw(img)
    
    # Crear degradado vertical
    for y in range(800):
        # Degradado de gris oscuro a gris medio
        r = int(45 + (y / 800) * 30)
        g = int(52 + (y / 800) * 33)
        b = int(54 + (y / 800) * 36)
        draw.line([(0, y), (600, y)], fill=(r, g, b))
    
    # Marco decorativo
    draw.rectangle([(30, 30), (570, 770)], outline=(200, 200, 200), width=3)
    draw.rectangle([(40, 40), (560, 760)], outline=(150, 150, 150), width=1)
    
    # Icono de libro en el centro
    book_icon_y = 250
    
    # Dibujar libro estilizado
    # Lomo del libro
    draw.rectangle([(250, book_icon_y), (280, book_icon_y + 120)], fill=(180, 180, 180), outline=(150, 150, 150), width=2)
    # Páginas
    draw.rectangle([(280, book_icon_y), (350, book_icon_y + 120)], fill=(240, 240, 240), outline=(200, 200, 200), width=2)
    # Líneas de páginas
    for i in range(5):
        y_pos = book_icon_y + 20 + (i * 20)
        draw.line([(285, y_pos), (345, y_pos)], fill=(200, 200, 200), width=1)
    
    # Texto
    try:
        font_title = ImageFont.truetype("arial.ttf", 48)
        font_subtitle = ImageFont.truetype("arial.ttf", 24)
        font_small = ImageFont.truetype("arial.ttf", 18)
    except:
        font_title = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Título principal
    text1 = "SIN PORTADA"
    bbox1 = draw.textbbox((0, 0), text1, font=font_title)
    w1 = bbox1[2] - bbox1[0]
    draw.text(((600-w1)/2, 450), text1, fill=(220, 220, 220), font=font_title)
    
    # Subtítulo
    text2 = "Imagen no disponible"
    bbox2 = draw.textbbox((0, 0), text2, font=font_subtitle)
    w2 = bbox2[2] - bbox2[0]
    draw.text(((600-w2)/2, 520), text2, fill=(180, 180, 180), font=font_subtitle)
    
    # Línea decorativa
    draw.line([(150, 600), (450, 600)], fill=(150, 150, 150), width=2)
    
    # Texto inferior
    text3 = "Catálogo de Libros"
    bbox3 = draw.textbbox((0, 0), text3, font=font_small)
    w3 = bbox3[2] - bbox3[0]
    draw.text(((600-w3)/2, 650), text3, fill=(160, 160, 160), font=font_small)
    
    return img

def save_image_locally():
    """Guardar imagen localmente"""
    print("\n📸 Creando imagen por defecto mejorada...")
    img = create_elegant_book_cover()
    
    filename = "default_book_cover_elegant.png"
    img.save(filename)
    print(f"✓ Imagen guardada como '{filename}'")
    print(f"✓ Puedes verla en: C:\\Proyectos\\Catalogo\\{filename}")
    
    return filename

def update_databases_with_new_image(new_url):
    """Actualizar bases de datos con nueva URL"""
    
    # Actualizar LOCAL
    try:
        conn = sqlite3.connect(LOCAL_DB)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT COUNT(*) 
            FROM core_titulos 
            WHERE portada_cloudinary = ?
        """, (OLD_DEFAULT_URL,))
        count = cursor.fetchone()[0]
        
        print(f"\n📊 Base de Datos LOCAL")
        print(f"   Libros con imagen antigua: {count}")
        
        if count > 0:
            cursor.execute("""
                UPDATE core_titulos 
                SET portada_cloudinary = ? 
                WHERE portada_cloudinary = ?
            """, (new_url, OLD_DEFAULT_URL))
            
            conn.commit()
            print(f"   ✓ Actualizados {count} libros")
        
        conn.close()
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
    
    # Actualizar TURSO
    try:
        sql_count = f"""
            SELECT COUNT(*) 
            FROM core_titulos 
            WHERE portada_cloudinary = '{OLD_DEFAULT_URL}'
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
                SET portada_cloudinary = '{new_url}' 
                WHERE portada_cloudinary = '{OLD_DEFAULT_URL}'
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
                print(f"   ✗ Error al actualizar")
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")

def main():
    print("=" * 60)
    print("CREAR IMAGEN POR DEFECTO MEJORADA")
    print("=" * 60)
    
    # Crear y guardar imagen
    filename = save_image_locally()
    
    print("\n" + "=" * 60)
    print("PRÓXIMOS PASOS")
    print("=" * 60)
    print("\n1. Revisa la imagen generada:")
    print(f"   {filename}")
    print("\n2. Si te gusta, súbela a Cloudinary u otro servicio")
    print("\n3. Ejecuta este script de nuevo con la nueva URL:")
    print("   - Edita la variable NEW_IMAGE_URL")
    print("   - Descomenta la línea de update_databases_with_new_image()")
    print("\n⚠️  Por ahora, solo he creado la imagen localmente")
    print("   para que la revises antes de actualizar las bases de datos.")
    
    # Descomentar cuando tengas la URL de la nueva imagen:
    # NEW_IMAGE_URL = "https://tu-url-aqui.com/imagen.png"
    # update_databases_with_new_image(NEW_IMAGE_URL)

if __name__ == "__main__":
    main()
