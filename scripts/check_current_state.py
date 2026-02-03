import sqlite3

conn = sqlite3.connect(r'C:\ProyectosDjango\casateca\db.sqlite3')
cursor = conn.cursor()

print('Verificando estado actual de Andrés Trapiello:')
cursor.execute("SELECT id, nombreAutor, created FROM core_autores WHERE nombreAutor = 'Andrés Trapiello' ORDER BY id")
rows = cursor.fetchall()

for row in rows:
    print(f'  ID: {row[0]}, Nombre: {row[1]}, Created: {row[2]}')

print(f'\nTotal registros: {len(rows)}')

conn.close()
