"""
Script para sincronizar BD Turso → Local
1. Añade campo portada_cloudinary a BD local
2. Importa datos desde Turso
"""

import sqlite3
import requests
import os

# Configuración
LOCAL_DB = r'C:\ProyectosDjango\casateca\db.sqlite3'
TURSO_URL = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA'

def query_turso(sql):
    """Ejecutar query en Turso"""
    headers = {
        'Authorization': f'Bearer {TURSO_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    payload = {'statements': [{'q': sql}]}
    
    try:
        response = requests.post(TURSO_URL, headers=headers, json=payload, timeout=30)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                results = data[0].get('results', {})
                return results.get('rows', []), results.get('columns', [])
        return [], []
    except Exception as e:
        print(f"❌ Error en Turso: {str(e)}")
        return [], []

print("=" * 70)
print("SINCRONIZACIÓN TURSO → LOCAL")
print("=" * 70)

# Paso 1: Añadir campo a BD local
print("\n📋 Paso 1: Modificando estructura de BD local...")

try:
    conn = sqlite3.connect(LOCAL_DB)
    cursor = conn.cursor()
    
    # Verificar si el campo ya existe
    cursor.execute("PRAGMA table_info(core_titulos)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'portada_cloudinary' in columns:
        print("   ⚠️  El campo 'portada_cloudinary' ya existe")
    else:
        cursor.execute("ALTER TABLE core_titulos ADD COLUMN portada_cloudinary TEXT")
        conn.commit()
        print("   ✅ Campo 'portada_cloudinary' añadido")
    
    conn.close()
    
except Exception as e:
    print(f"   ❌ Error modificando BD local: {str(e)}")
    exit(1)

# Paso 2: Obtener datos de Turso
print("\n📥 Paso 2: Obteniendo datos de Turso...")

rows, cols = query_turso("""
    SELECT id, EAN, portada_cloudinary 
    FROM core_titulos 
    WHERE portada_cloudinary IS NOT NULL
    ORDER BY id
""")

if not rows:
    print("   ❌ No se pudieron obtener datos de Turso")
    exit(1)

print(f"   ✅ Obtenidos {len(rows)} registros con URLs de Cloudinary")

# Paso 3: Actualizar BD local
print("\n💾 Paso 3: Actualizando BD local...")

try:
    conn = sqlite3.connect(LOCAL_DB)
    cursor = conn.cursor()
    
    updated = 0
    not_found = 0
    errors = 0
    
    for i, row in enumerate(rows):
        try:
            libro_id = row[0]
            ean = row[1]
            cloudinary_url = row[2]
            
            # Actualizar por ID
            cursor.execute(
                "UPDATE core_titulos SET portada_cloudinary = ? WHERE id = ?",
                (cloudinary_url, libro_id)
            )
            
            if cursor.rowcount > 0:
                updated += 1
            else:
                not_found += 1
            
            # Mostrar progreso cada 100 registros
            if (i + 1) % 100 == 0:
                print(f"   Progreso: {i + 1}/{len(rows)} ({round((i + 1) / len(rows) * 100)}%)")
                conn.commit()  # Commit intermedio
        
        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"   ❌ Error en registro {libro_id}: {str(e)}")
    
    conn.commit()
    conn.close()
    
    print(f"\n   ✅ Actualización completada")
    print(f"      - Actualizados: {updated}")
    print(f"      - No encontrados: {not_found}")
    print(f"      - Errores: {errors}")
    
except Exception as e:
    print(f"   ❌ Error actualizando BD local: {str(e)}")
    exit(1)

# Paso 4: Verificar
print("\n🔍 Paso 4: Verificando sincronización...")

try:
    conn = sqlite3.connect(LOCAL_DB)
    cursor = conn.cursor()
    
    # Contar registros con portada_cloudinary
    cursor.execute("SELECT COUNT(*) FROM core_titulos WHERE portada_cloudinary IS NOT NULL")
    count_local = cursor.fetchone()[0]
    
    print(f"   ✅ Registros en local con URL Cloudinary: {count_local}")
    
    # Mostrar muestra
    print("\n📖 Muestra de registros actualizados:")
    cursor.execute("""
        SELECT id, EAN, Titulo, portada_cloudinary 
        FROM core_titulos 
        WHERE portada_cloudinary IS NOT NULL 
        LIMIT 5
    """)
    
    for row in cursor.fetchall():
        libro_id, ean, titulo, url = row
        url_short = url[:60] + '...' if len(url) > 60 else url
        print(f"   {libro_id}. [{ean}] {titulo}")
        print(f"      {url_short}")
    
    conn.close()
    
except Exception as e:
    print(f"   ❌ Error verificando: {str(e)}")

print("\n" + "=" * 70)
print("🎉 SINCRONIZACIÓN COMPLETADA")
print("=" * 70)

print(f"""
✅ La base de datos local ahora tiene:
   - Campo 'portada_cloudinary' añadido
   - {updated} URLs de Cloudinary sincronizadas desde Turso

📁 Base de datos local: {LOCAL_DB}

💡 Ahora puedes:
   1. Usar la aplicación Catálogo Manager
   2. Ver las imágenes en tu aplicación Django
   3. Sincronizar cambios en ambas direcciones
""")
