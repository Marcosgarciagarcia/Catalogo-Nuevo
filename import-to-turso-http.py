import sqlite3
import os
import sys
import requests
import json

# Configuración
LOCAL_DB = r'C:\ProyectosDjango\casateca\db.sqlite3'
TURSO_URL = os.getenv('TURSO_DATABASE_URL')
TURSO_TOKEN = os.getenv('TURSO_AUTH_TOKEN')

if not TURSO_URL or not TURSO_TOKEN:
    print("❌ Error: Faltan credenciales de Turso")
    sys.exit(1)

# Convertir URL de libsql:// a https://
http_url = TURSO_URL.replace('libsql://', 'https://')

print("📂 Conectando a SQLite local...")
local_conn = sqlite3.connect(LOCAL_DB)
local_conn.row_factory = sqlite3.Row
local_cursor = local_conn.cursor()

def execute_turso_sql(sql, params=None):
    """Ejecutar SQL en Turso usando HTTP API"""
    headers = {
        'Authorization': f'Bearer {TURSO_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'statements': [
            {
                'q': sql,
                'params': params or []
            }
        ]
    }
    
    try:
        response = requests.post(http_url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ Error HTTP: {str(e)}")
        return None

print("\n" + "=" * 70)
print("CREANDO ESQUEMA EN TURSO")
print("=" * 70)

# Obtener todas las tablas
local_cursor.execute("""
    SELECT name, sql FROM sqlite_master 
    WHERE type='table' 
    AND name NOT LIKE 'sqlite_%'
    AND name NOT LIKE 'django_migrations'
    ORDER BY name
""")
tables = local_cursor.fetchall()

print(f"\n📋 Encontradas {len(tables)} tablas")

# Crear tablas
for table in tables:
    table_name = table['name']
    create_sql = table['sql']
    
    print(f"📋 Creando tabla: {table_name}...", end=' ')
    result = execute_turso_sql(create_sql)
    
    if result:
        print("✅")
    else:
        print("❌")

print("\n" + "=" * 70)
print("MIGRANDO DATOS (MÉTODO OPTIMIZADO)")
print("=" * 70)

total_migrated = 0

for table in tables:
    table_name = table['name']
    
    # Contar registros
    local_cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
    count = local_cursor.fetchone()['count']
    
    if count == 0:
        print(f"\n⏭️  {table_name}: Sin datos")
        continue
    
    print(f"\n📦 {table_name}: {count} registros")
    
    # Obtener columnas
    local_cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [col['name'] for col in local_cursor.fetchall()]
    columns_str = ', '.join(columns)
    placeholders = ', '.join(['?' for _ in columns])
    
    # Obtener datos
    local_cursor.execute(f"SELECT * FROM {table_name}")
    rows = local_cursor.fetchall()
    
    # Insertar en lotes de 50 (más pequeño para evitar timeouts)
    batch_size = 50
    inserted = 0
    errors = 0
    
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        
        # Crear múltiples statements para el batch
        statements = []
        for row in batch:
            values = [row[col] for col in columns]
            # Convertir valores None a NULL
            params = [None if v is None else v for v in values]
            
            statements.append({
                'q': f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})",
                'params': params
            })
        
        # Ejecutar batch
        headers = {
            'Authorization': f'Bearer {TURSO_TOKEN}',
            'Content-Type': 'application/json'
        }
        
        payload = {'statements': statements}
        
        try:
            response = requests.post(http_url, headers=headers, json=payload, timeout=60)
            
            if response.status_code == 200:
                inserted += len(batch)
                if (i + batch_size) % 200 == 0:
                    print(f"   Progreso: {min(i + batch_size, count)}/{count} ({round(min(i + batch_size, count) / count * 100)}%)")
            else:
                errors += len(batch)
                if errors <= 3:
                    print(f"   ❌ Error en batch {i//batch_size + 1}: {response.status_code}")
        
        except Exception as e:
            errors += len(batch)
            if errors <= 3:
                print(f"   ❌ Error: {str(e)}")
    
    total_migrated += inserted
    print(f"   ✅ Completado: {inserted}/{count} registros")
    if errors > 0:
        print(f"   ⚠️  {errors} errores")

print("\n" + "=" * 70)
print("VERIFICANDO MIGRACIÓN")
print("=" * 70)

for table in tables[:10]:  # Verificar primeras 10 tablas
    table_name = table['name']
    
    result = execute_turso_sql(f"SELECT COUNT(*) as total FROM {table_name}")
    
    if result and 'results' in result:
        try:
            turso_count = result['results'][0]['rows'][0][0]
            
            local_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            local_count = local_cursor.fetchone()[0]
            
            status = "✅" if turso_count == local_count else "⚠️"
            print(f"  {status} {table_name:30} | Local: {local_count:5} | Turso: {turso_count:5}")
        except:
            print(f"  ❌ {table_name:30} | Error verificando")

local_conn.close()

print("\n" + "=" * 70)
print("🎉 MIGRACIÓN COMPLETADA")
print("=" * 70)
print(f"""
✅ Total de registros migrados: {total_migrated}
📊 Total de tablas: {len(tables)}

🔗 Base de datos en Turso:
   {TURSO_URL}
""")
