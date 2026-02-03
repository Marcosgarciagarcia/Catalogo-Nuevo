import sqlite3
import os
from libsql_client import create_client

# Configuración
LOCAL_DB = r'C:\ProyectosDjango\casateca\db.sqlite3'
TURSO_URL = os.getenv('TURSO_DATABASE_URL')
TURSO_TOKEN = os.getenv('TURSO_AUTH_TOKEN')

if not TURSO_URL or not TURSO_TOKEN:
    print("❌ Error: Faltan credenciales de Turso")
    print("   Configura TURSO_DATABASE_URL y TURSO_AUTH_TOKEN")
    exit(1)

# Conectar a SQLite local
print("📂 Conectando a SQLite local...")
local_conn = sqlite3.connect(LOCAL_DB)
local_cursor = local_conn.cursor()

# Conectar a Turso
print("☁️  Conectando a Turso...")
turso_client = create_client(
    url=TURSO_URL,
    auth_token=TURSO_TOKEN
)

print("\n" + "=" * 60)
print("CREANDO ESQUEMA EN TURSO")
print("=" * 60)

# Crear tabla principal de libros
print("\n📋 Creando tabla 'libros'...")
turso_client.execute("""
    CREATE TABLE IF NOT EXISTS libros (
        id INTEGER PRIMARY KEY,
        ean TEXT UNIQUE,
        titulo TEXT NOT NULL,
        titulo_original TEXT,
        autor TEXT,
        editorial TEXT,
        ano_publicacion TEXT,
        num_paginas INTEGER,
        portada_url TEXT,
        sinopsis TEXT,
        genero TEXT,
        idioma TEXT,
        isbn TEXT,
        valoracion REAL,
        created_at DATETIME,
        updated_at DATETIME
    );
""")

# Crear índices
print("🔍 Creando índices...")
turso_client.execute("CREATE INDEX IF NOT EXISTS idx_ean ON libros(ean);")
turso_client.execute("CREATE INDEX IF NOT EXISTS idx_titulo ON libros(titulo);")
turso_client.execute("CREATE INDEX IF NOT EXISTS idx_autor ON libros(autor);")
turso_client.execute("CREATE INDEX IF NOT EXISTS idx_editorial ON libros(editorial);")

print("✅ Esquema creado exitosamente")

print("\n" + "=" * 60)
print("MIGRANDO DATOS")
print("=" * 60)

# Obtener datos de core_titulos
print("\n📖 Leyendo datos de core_titulos...")
local_cursor.execute("""
    SELECT 
        t.id,
        t.EAN,
        t.Titulo,
        t.TituloOriginal,
        a.nombreAutor,
        e.Editorial,
        t.AnoPublicacion,
        t.NumPaginas,
        t.Portada,
        t.Sinopsis,
        g.Genero,
        i.Idioma,
        t.ISBN,
        t.created,
        t.updated
    FROM core_titulos t
    LEFT JOIN core_autores a ON t.codiAutor_id = a.id
    LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
    LEFT JOIN core_generos g ON t.codiGenero_id = g.id
    LEFT JOIN core_idiomas i ON t.codiIdioma_id = i.id
    ORDER BY t.id
""")

libros = local_cursor.fetchall()
total = len(libros)

print(f"📚 Encontrados {total} libros para migrar")

inserted = 0
skipped = 0
errors = 0

print("\n💾 Insertando datos en Turso...")

for i, libro in enumerate(libros):
    try:
        (id_, ean, titulo, titulo_orig, autor, editorial, ano, paginas, 
         portada, sinopsis, genero, idioma, isbn, created, updated) = libro
        
        # Construir URL completa de portada si existe
        portada_url = None
        if portada:
            if portada.startswith('http'):
                portada_url = portada
            elif portada.startswith('media/'):
                portada_url = f"https://res.cloudinary.com/casateca/image/upload/{portada}"
        
        turso_client.execute({
            "sql": """
                INSERT INTO libros (
                    id, ean, titulo, titulo_original, autor, editorial,
                    ano_publicacion, num_paginas, portada_url, sinopsis,
                    genero, idioma, isbn, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            "args": [
                id_, ean, titulo, titulo_orig, autor, editorial,
                ano, paginas, portada_url, sinopsis,
                genero, idioma, isbn, created, updated
            ]
        })
        
        inserted += 1
        
        if (i + 1) % 100 == 0:
            print(f"   Progreso: {i + 1}/{total} ({round((i + 1) / total * 100)}%)")
            
    except Exception as e:
        if 'UNIQUE constraint failed' in str(e):
            skipped += 1
        else:
            print(f"❌ Error en libro ID {id_}: {str(e)}")
            errors += 1

print("\n" + "=" * 60)
print("RESUMEN DE MIGRACIÓN")
print("=" * 60)
print(f"Total en SQLite local: {total}")
print(f"✅ Insertados: {inserted}")
print(f"⏭️  Omitidos (duplicados): {skipped}")
print(f"❌ Errores: {errors}")

# Verificar migración
print("\n" + "=" * 60)
print("VERIFICANDO MIGRACIÓN")
print("=" * 60)

result = turso_client.execute("SELECT COUNT(*) as total FROM libros")
total_turso = result['rows'][0]['total']
print(f"Total de registros en Turso: {total_turso}")

# Mostrar muestra
print("\n📖 Primeros 5 registros en Turso:")
sample = turso_client.execute("SELECT id, ean, titulo, autor FROM libros LIMIT 5")
for row in sample['rows']:
    print(f"  {row['id']}. {row['titulo']} - {row['autor']}")

# Estadísticas
print("\n📊 Estadísticas:")
autores = turso_client.execute("SELECT COUNT(DISTINCT autor) as total FROM libros WHERE autor IS NOT NULL")
print(f"  Autores únicos: {autores['rows'][0]['total']}")

editoriales = turso_client.execute("SELECT COUNT(DISTINCT editorial) as total FROM libros WHERE editorial IS NOT NULL")
print(f"  Editoriales únicas: {editoriales['rows'][0]['total']}")

generos = turso_client.execute("SELECT COUNT(DISTINCT genero) as total FROM libros WHERE genero IS NOT NULL")
print(f"  Géneros únicos: {generos['rows'][0]['total']}")

# Cerrar conexiones
local_conn.close()

if total_turso == inserted + skipped:
    print("\n🎉 ¡Migración completada exitosamente!")
else:
    print("\n⚠️ Advertencia: Hay diferencias en los totales")

print("\n" + "=" * 60)
