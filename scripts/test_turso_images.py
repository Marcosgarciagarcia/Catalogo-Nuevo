"""
Probar carga de imágenes desde Turso para ver qué URLs se están obteniendo
"""

import requests

TURSO_URL = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA'

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
        
        return []
    except Exception as e:
        print(f"Error: {str(e)}")
        return []

def main():
    print("=" * 80)
    print("PRUEBA DE CARGA DE IMÁGENES DESDE TURSO")
    print("=" * 80)
    
    # Query similar a la que usa la aplicación
    sql = """
        SELECT t.id, t.EAN, t.titulo, a.nombreAutor, e.descriEditorial, 
               t.anyoEdicion, t.portada_cloudinary, t.sinopsis
        FROM core_titulos t
        LEFT JOIN core_autores a ON t.codiAutor_id = a.id
        LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
        ORDER BY t.titulo
        LIMIT 10
    """
    
    print("\n📚 Primeros 10 libros desde Turso:")
    print("-" * 80)
    
    books = query_turso(sql)
    
    for i, book in enumerate(books, 1):
        print(f"\n{i}. {book[2]}")  # Título
        print(f"   ID: {book[0]}")
        print(f"   Autor: {book[3] or 'N/A'}")
        print(f"   Portada Cloudinary: {book[6] or 'NULL'}")
        if book[6]:
            if 'default_book_cover_elegant' in book[6]:
                print(f"   ✓ Usando imagen elegante nueva")
            else:
                print(f"   ⚠️  Usando otra imagen")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    main()
