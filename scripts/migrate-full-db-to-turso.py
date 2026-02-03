import sqlite3
import os
import sys
import asyncio
from libsql_client import create_client_sync

# Configuración
LOCAL_DB = r'C:\ProyectosDjango\casateca\db.sqlite3'
TURSO_URL = os.getenv('TURSO_DATABASE_URL')
TURSO_TOKEN = os.getenv('TURSO_AUTH_TOKEN')

if not TURSO_URL or not TURSO_TOKEN:
    print("❌ Error: Faltan credenciales de Turso")
    print("   Configura TURSO_DATABASE_URL y TURSO_AUTH_TOKEN")
    sys.exit(1)

# Conectar a SQLite local
print("📂 Conectando a SQLite local...")
local_conn = sqlite3.connect(LOCAL_DB)
local_conn.row_factory = sqlite3.Row
local_cursor = local_conn.cursor()

# Conectar a Turso (versión síncrona)
print("☁️  Conectando a Turso...")
turso_client = create_client_sync(
    url=TURSO_URL,
    auth_token=TURSO_TOKEN
)

print("\n" + "=" * 70)
print("OBTENIENDO ESTRUCTURA DE LA BASE DE DATOS")
print("=" * 70)

# Obtener todas las tablas (excluyendo tablas del sistema)
local_cursor.execute("""
    SELECT name, sql FROM sqlite_master 
    WHERE type='table' 
    AND name NOT LIKE 'sqlite_%'
    AND name NOT LIKE 'django_migrations'
    ORDER BY name
""")
tables = local_cursor.fetchall()

print(f"\n📋 Encontradas {len(tables)} tablas para migrar:")
for table in tables:
    print(f"   - {table['name']}")

print("\n" + "=" * 70)
print("CREANDO ESQUEMA EN TURSO")
print("=" * 70)

# Crear cada tabla en Turso
for table in tables:
    table_name = table['name']
    create_sql = table['sql']
    
    print(f"\n📋 Creando tabla: {table_name}")
    
    try:
        # Modificar el SQL para hacerlo compatible con Turso si es necesario
        # Turso soporta la mayoría de sintaxis de SQLite
        turso_client.execute(create_sql)
        print(f"   ✅ Tabla '{table_name}' creada")
    except Exception as e:
        if 'already exists' in str(e).lower():
            print(f"   ⚠️  Tabla '{table_name}' ya existe, continuando...")
        else:
            print(f"   ❌ Error creando tabla '{table_name}': {str(e)}")

# Obtener índices
print("\n🔍 Creando índices...")
local_cursor.execute("""
    SELECT name, sql FROM sqlite_master 
    WHERE type='index' 
    AND name NOT LIKE 'sqlite_%'
    AND sql IS NOT NULL
    ORDER BY name
""")
indexes = local_cursor.fetchall()

for index in indexes:
    try:
        turso_client.execute(index['sql'])
        print(f"   ✅ Índice '{index['name']}' creado")
    except Exception as e:
        if 'already exists' in str(e).lower():
            print(f"   ⚠️  Índice '{index['name']}' ya existe")
        else:
            print(f"   ❌ Error: {str(e)}")

print("\n✅ Esquema completo creado en Turso")

print("\n" + "=" * 70)
print("MIGRANDO DATOS")
print("=" * 70)

total_migrated = 0
migration_stats = {}

for table in tables:
    table_name = table['name']
    
    # Contar registros
    local_cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
    count = local_cursor.fetchone()['count']
    
    if count == 0:
        print(f"\n⏭️  Tabla '{table_name}': Sin datos, omitiendo...")
        migration_stats[table_name] = {'total': 0, 'inserted': 0, 'errors': 0}
        continue
    
    print(f"\n📦 Migrando tabla '{table_name}' ({count} registros)...")
    
    # Obtener nombres de columnas
    local_cursor.execute(f"PRAGMA table_info({table_name})")
    columns_info = local_cursor.fetchall()
    column_names = [col['name'] for col in columns_info]
    
    # Obtener todos los datos
    local_cursor.execute(f"SELECT * FROM {table_name}")
    rows = local_cursor.fetchall()
    
    inserted = 0
    errors = 0
    
    for i, row in enumerate(rows):
        try:
            # Convertir Row a lista de valores
            values = [row[col] for col in column_names]
            
            # Crear placeholders para la query
            placeholders = ','.join(['?' for _ in column_names])
            columns_str = ','.join(column_names)
            
            sql = f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})"
            
            turso_client.execute({
                "sql": sql,
                "args": values
            })
            
            inserted += 1
            
            # Mostrar progreso cada 100 registros
            if (i + 1) % 100 == 0:
                print(f"   Progreso: {i + 1}/{count} ({round((i + 1) / count * 100)}%)")
                
        except Exception as e:
            if 'UNIQUE constraint failed' not in str(e):
                errors += 1
                if errors <= 5:  # Mostrar solo los primeros 5 errores
                    print(f"   ❌ Error en registro {i + 1}: {str(e)}")
    
    migration_stats[table_name] = {
        'total': count,
        'inserted': inserted,
        'errors': errors
    }
    
    total_migrated += inserted
    
    print(f"   ✅ Completado: {inserted}/{count} registros insertados")
    if errors > 0:
        print(f"   ⚠️  {errors} errores encontrados")

print("\n" + "=" * 70)
print("RESUMEN DE MIGRACIÓN")
print("=" * 70)

print(f"\n📊 Estadísticas por tabla:")
print("-" * 70)
for table_name, stats in migration_stats.items():
    if stats['total'] > 0:
        success_rate = round((stats['inserted'] / stats['total']) * 100, 1)
        print(f"  {table_name:30} | Total: {stats['total']:5} | Insertados: {stats['inserted']:5} | Errores: {stats['errors']:3} | {success_rate}%")

print("-" * 70)
print(f"  {'TOTAL':30} | {sum(s['total'] for s in migration_stats.values()):5} registros migrados")
print("=" * 70)

print("\n" + "=" * 70)
print("VERIFICANDO MIGRACIÓN")
print("=" * 70)

print("\n🔍 Verificando integridad de datos...")

for table in tables:
    table_name = table['name']
    
    try:
        result = turso_client.execute(f"SELECT COUNT(*) as total FROM {table_name}")
        turso_count = result['rows'][0]['total']
        local_count = migration_stats[table_name]['total']
        
        if turso_count == local_count:
            status = "✅"
        elif turso_count > 0:
            status = "⚠️"
        else:
            status = "❌"
        
        print(f"  {status} {table_name:30} | Local: {local_count:5} | Turso: {turso_count:5}")
        
    except Exception as e:
        print(f"  ❌ {table_name:30} | Error verificando: {str(e)}")

# Mostrar algunas muestras de datos
print("\n" + "=" * 70)
print("MUESTRAS DE DATOS MIGRADOS")
print("=" * 70)

# Muestra de core_titulos
print("\n📚 Muestra de 'core_titulos':")
try:
    result = turso_client.execute("""
        SELECT id, EAN, Titulo, AnoPublicacion 
        FROM core_titulos 
        LIMIT 5
    """)
    for row in result['rows']:
        print(f"  {row['id']}. [{row['EAN']}] {row['Titulo']} ({row['AnoPublicacion']})")
except Exception as e:
    print(f"  ❌ Error: {str(e)}")

# Muestra de core_autores
print("\n👤 Muestra de 'core_autores':")
try:
    result = turso_client.execute("""
        SELECT id, nombreAutor 
        FROM core_autores 
        LIMIT 5
    """)
    for row in result['rows']:
        print(f"  {row['id']}. {row['nombreAutor']}")
except Exception as e:
    print(f"  ❌ Error: {str(e)}")

# Muestra de core_editoriales
print("\n🏢 Muestra de 'core_editoriales':")
try:
    result = turso_client.execute("""
        SELECT id, Editorial 
        FROM core_editoriales 
        LIMIT 5
    """)
    for row in result['rows']:
        print(f"  {row['id']}. {row['Editorial']}")
except Exception as e:
    print(f"  ❌ Error: {str(e)}")

# Cerrar conexión local
local_conn.close()

print("\n" + "=" * 70)
print("🎉 MIGRACIÓN COMPLETADA")
print("=" * 70)

print(f"""
✅ Base de datos completa migrada a Turso
📊 Total de tablas: {len(tables)}
📦 Total de registros: {total_migrated}

🔗 Tu base de datos en Turso:
   {TURSO_URL}

📝 Próximos pasos:
   1. Verificar datos en el dashboard de Turso
   2. Actualizar rutas de imágenes cruzando con JSON
   3. Adaptar el frontend para usar Turso
""")
