import sqlite3
import json

# Conectar a la base de datos local
conn = sqlite3.connect(r'C:\ProyectosDjango\casateca\db.sqlite3')
cursor = conn.cursor()

# Obtener todas las tablas
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print("=" * 60)
print("TABLAS EN LA BASE DE DATOS")
print("=" * 60)
for table in tables:
    print(f"- {table[0]}")

print("\n" + "=" * 60)
print("ESTRUCTURA DE CADA TABLA")
print("=" * 60)

for table in tables:
    table_name = table[0]
    print(f"\n📋 Tabla: {table_name}")
    print("-" * 60)
    
    # Obtener esquema
    cursor.execute(f"PRAGMA table_info({table_name});")
    columns = cursor.fetchall()
    
    print("Columnas:")
    for col in columns:
        col_id, name, type_, notnull, default, pk = col
        pk_str = " [PRIMARY KEY]" if pk else ""
        notnull_str = " NOT NULL" if notnull else ""
        default_str = f" DEFAULT {default}" if default else ""
        print(f"  - {name}: {type_}{pk_str}{notnull_str}{default_str}")
    
    # Contar registros
    cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
    count = cursor.fetchone()[0]
    print(f"\nTotal de registros: {count}")
    
    # Mostrar primeros 3 registros si hay datos
    if count > 0:
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 3;")
        rows = cursor.fetchall()
        print("\nPrimeros 3 registros:")
        for i, row in enumerate(rows, 1):
            print(f"  {i}. {row}")

conn.close()

print("\n" + "=" * 60)
print("ANÁLISIS COMPLETADO")
print("=" * 60)
