import sqlite3

# Conectar a la base de datos
conn = sqlite3.connect(r'C:\ProyectosDjango\casateca\db.sqlite3')
cursor = conn.cursor()

# Buscar autores duplicados
cursor.execute('''
    SELECT nombreAutor, COUNT(*) as count 
    FROM core_autores 
    GROUP BY nombreAutor 
    HAVING count > 1 
    ORDER BY count DESC
''')

duplicates = cursor.fetchall()

print('='*60)
print('ANÁLISIS DE AUTORES DUPLICADOS')
print('='*60)

if duplicates:
    print(f'\n📊 Autores duplicados encontrados: {len(duplicates)}\n')
    for autor, count in duplicates[:20]:  # Mostrar primeros 20
        print(f'  • {autor}: {count} veces')
        
        # Mostrar IDs de los duplicados
        cursor.execute('SELECT id, created, updated FROM core_autores WHERE nombreAutor = ?', (autor,))
        registros = cursor.fetchall()
        for reg_id, created, updated in registros:
            print(f'    - ID: {reg_id}, Created: {created}, Updated: {updated}')
        print()
else:
    print('\n✅ No se encontraron autores duplicados')

# Estadísticas generales
cursor.execute('SELECT COUNT(*) FROM core_autores')
total = cursor.fetchone()[0]

cursor.execute('SELECT COUNT(DISTINCT nombreAutor) FROM core_autores')
unicos = cursor.fetchone()[0]

print('='*60)
print('ESTADÍSTICAS')
print('='*60)
print(f'Total de registros: {total}')
print(f'Autores únicos: {unicos}')
print(f'Duplicados: {total - unicos}')

conn.close()
