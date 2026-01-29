import sqlite3
import sys

# Configuración
LOCAL_DB = r'C:\ProyectosDjango\casateca\db.sqlite3'
OUTPUT_FILE = 'database-export.sql'

print("📂 Conectando a SQLite local...")
conn = sqlite3.connect(LOCAL_DB)
cursor = conn.cursor()

print("📝 Exportando base de datos a SQL...")

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    # Escribir header
    f.write("-- Exportación de base de datos SQLite\n")
    f.write("-- Generado automáticamente\n\n")
    
    # Obtener todas las tablas
    cursor.execute("""
        SELECT name, sql FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE 'django_migrations'
        ORDER BY name
    """)
    tables = cursor.fetchall()
    
    total_records = 0
    
    for table_name, create_sql in tables:
        print(f"\n📋 Procesando tabla: {table_name}")
        
        # Escribir CREATE TABLE
        f.write(f"\n-- Tabla: {table_name}\n")
        f.write(f"{create_sql};\n\n")
        
        # Contar registros
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        
        if count == 0:
            f.write(f"-- Sin datos en {table_name}\n\n")
            continue
        
        print(f"   Exportando {count} registros...")
        
        # Obtener datos
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        # Obtener nombres de columnas
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [col[1] for col in cursor.fetchall()]
        
        # Escribir INSERTs en lotes
        batch_size = 100
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i+batch_size]
            
            for row in batch:
                # Escapar valores
                values = []
                for val in row:
                    if val is None:
                        values.append('NULL')
                    elif isinstance(val, str):
                        # Escapar comillas simples
                        escaped = val.replace("'", "''")
                        values.append(f"'{escaped}'")
                    elif isinstance(val, (int, float)):
                        values.append(str(val))
                    else:
                        values.append(f"'{str(val)}'")
                
                columns_str = ', '.join(columns)
                values_str = ', '.join(values)
                f.write(f"INSERT INTO {table_name} ({columns_str}) VALUES ({values_str});\n")
            
            total_records += len(batch)
            
            if (i + batch_size) % 500 == 0:
                print(f"   Progreso: {min(i + batch_size, count)}/{count}")
        
        f.write("\n")
    
    # Exportar índices
    f.write("\n-- Índices\n")
    cursor.execute("""
        SELECT sql FROM sqlite_master 
        WHERE type='index' 
        AND name NOT LIKE 'sqlite_%'
        AND sql IS NOT NULL
    """)
    indexes = cursor.fetchall()
    
    for (index_sql,) in indexes:
        f.write(f"{index_sql};\n")

conn.close()

print(f"\n✅ Exportación completada")
print(f"📊 Total de tablas: {len(tables)}")
print(f"📦 Total de registros: {total_records}")
print(f"📄 Archivo generado: {OUTPUT_FILE}")
print(f"\n💡 Próximo paso: Importar este archivo a Turso usando el dashboard web")
