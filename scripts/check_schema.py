import sqlite3

db_path = r'C:\ProyectosDjango\casateca\db.sqlite3'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Obtener esquema de core_titulos
schema = cursor.execute("PRAGMA table_info(core_titulos)").fetchall()

print("Columnas de core_titulos:")
print("="*60)
for col in schema:
    print(f"{col[1]:20s} {col[2]:15s}")

conn.close()
