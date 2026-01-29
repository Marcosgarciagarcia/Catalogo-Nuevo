import os
import requests

TURSO_URL = os.getenv('TURSO_DATABASE_URL', 'libsql://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io')
TURSO_TOKEN = os.getenv('TURSO_AUTH_TOKEN', 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA')

http_url = TURSO_URL.replace('libsql://', 'https://')

def query(sql):
    response = requests.post(
        http_url,
        headers={'Authorization': f'Bearer {TURSO_TOKEN}', 'Content-Type': 'application/json'},
        json={'statements': [{'q': sql}]},
        timeout=30
    )
    if response.status_code == 200:
        data = response.json()
        results = data[0].get('results', {})
        return results.get('rows', []), results.get('columns', [])
    return [], []

print("="*100)
print("ESTRUCTURA Y DATOS DE core_titulos")
print("="*100)

# Estructura
print("\n1. COLUMNAS:")
rows, _ = query("PRAGMA table_info(core_titulos)")
for row in rows:
    print(f"   {row[0]:2}. {row[1]:30} {row[2]:15} {'PK' if row[5] else ''}")

# Datos de ejemplo
print("\n2. PRIMEROS 5 LIBROS (TODOS LOS CAMPOS):")
rows, cols = query("SELECT * FROM core_titulos LIMIT 5")

for i, row in enumerate(rows, 1):
    print(f"\n{'='*100}")
    print(f"LIBRO {i}")
    print(f"{'='*100}")
    for col, val in zip(cols, row):
        if val and isinstance(val, str) and len(val) > 200:
            val = val[:200] + "..."
        print(f"  {col:30} : {val}")

# Estadísticas
print(f"\n{'='*100}")
print("3. ESTADÍSTICAS:")
print(f"{'='*100}")

for col in cols:
    rows_stat, _ = query(f"SELECT COUNT(*) FROM core_titulos WHERE {col} IS NOT NULL")
    count = rows_stat[0][0] if rows_stat else 0
    print(f"  {col:30} : {count:4} registros con datos")

print(f"\n{'='*100}")
print("✅ COMPLETADO")
print(f"{'='*100}")
