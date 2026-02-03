import sqlite3

# Conectar a la base de datos
conn = sqlite3.connect(r'C:\ProyectosDjango\casateca\db.sqlite3')
cursor = conn.cursor()

print('='*80)
print('INFORME DETALLADO DE LIMPIEZA DE AUTORES DUPLICADOS')
print('='*80)
print()

# Lista de autores que fueron eliminados (IDs duplicados que se borraron)
ids_eliminados = [908, 968, 1052, 1446, 1354, 1438, 1369, 1311, 1332, 1413, 541, 1431, 1495, 1444, 1517]

# Lista de autores que se mantuvieron (IDs originales)
ids_mantenidos = [25, 11, 214, 1394, 808, 1356, 725, 843, 765, 1210, 91, 29, 1432, 1084, 1418]

# Mapeo de ID eliminado -> ID mantenido
mapeo = {
    908: 25,    # Andrés Trapiello
    968: 11,    # Bartolomé Yun Casalilla
    1052: 214,  # Chufo Lloréns
    1446: 1394, # David Day
    1354: 808,  # Erasmo de Rotterdam
    1438: 1356, # John Stuart Mill
    1369: 725,  # José Saramago
    1311: 843,  # Karl Marx
    1332: 765,  # Leandro Fernández de Moratín
    1413: 1210, # Led Zeppelin
    541: 91,    # Linda Lay Shuler
    1431: 29,   # Marlene Wind
    1495: 1432, # Martín Caparrós
    1444: 1084, # Mary Kirchoff
    1517: 1418  # Yago Álvarez Barba
}

print('📊 RESUMEN DE ELIMINACIÓN')
print('-'*80)
print(f'Total de IDs eliminados: {len(ids_eliminados)}')
print(f'Total de IDs mantenidos: {len(ids_mantenidos)}')
print()

print('📋 DETALLE POR AUTOR')
print('-'*80)

for id_eliminado, id_mantenido in mapeo.items():
    # Obtener nombre del autor mantenido
    cursor.execute('SELECT nombreAutor FROM core_autores WHERE id = ?', (id_mantenido,))
    resultado = cursor.fetchone()
    nombre_autor = resultado[0] if resultado else 'Desconocido'
    
    print(f'\n🔹 {nombre_autor}')
    print(f'   ID Mantenido: {id_mantenido}')
    print(f'   ID Eliminado: {id_eliminado}')
    
    # Buscar libros que ahora apuntan al ID mantenido
    # (fueron actualizados desde el ID eliminado)
    cursor.execute('''
        SELECT id, titulo, EAN 
        FROM core_titulos 
        WHERE codiAutor_id = ?
        ORDER BY titulo
    ''', (id_mantenido,))
    
    libros = cursor.fetchall()
    
    if libros:
        print(f'   📚 Libros asociados ({len(libros)}):')
        for libro_id, titulo, ean in libros:
            ean_str = f' (EAN: {ean})' if ean else ''
            print(f'      • ID {libro_id}: {titulo}{ean_str}')
    else:
        print(f'   📚 Sin libros asociados')

print()
print('='*80)
print('ANÁLISIS DE IMPACTO EN LIBROS')
print('='*80)
print()

# Contar total de libros afectados
total_libros_afectados = 0
libros_por_autor = {}

for id_eliminado, id_mantenido in mapeo.items():
    cursor.execute('SELECT COUNT(*) FROM core_titulos WHERE codiAutor_id = ?', (id_mantenido,))
    count = cursor.fetchone()[0]
    
    cursor.execute('SELECT nombreAutor FROM core_autores WHERE id = ?', (id_mantenido,))
    nombre = cursor.fetchone()[0]
    
    if count > 0:
        total_libros_afectados += count
        libros_por_autor[nombre] = count

print(f'📊 Total de libros afectados: {total_libros_afectados}')
print()

if libros_por_autor:
    print('📚 Distribución por autor:')
    for autor, count in sorted(libros_por_autor.items(), key=lambda x: x[1], reverse=True):
        print(f'   • {autor}: {count} libro(s)')

print()
print('='*80)
print('VERIFICACIÓN FINAL')
print('='*80)
print()

# Verificar que no quedan duplicados
cursor.execute('''
    SELECT nombreAutor, COUNT(*) as count 
    FROM core_autores 
    GROUP BY nombreAutor 
    HAVING count > 1
''')

duplicados_restantes = cursor.fetchall()

if duplicados_restantes:
    print('⚠️  ADVERTENCIA: Aún quedan duplicados:')
    for nombre, count in duplicados_restantes:
        print(f'   • {nombre}: {count} registros')
else:
    print('✅ No quedan autores duplicados')

# Estadísticas finales
cursor.execute('SELECT COUNT(*) FROM core_autores')
total_autores = cursor.fetchone()[0]

cursor.execute('SELECT COUNT(*) FROM core_titulos')
total_libros = cursor.fetchone()[0]

print()
print(f'📊 Estadísticas finales:')
print(f'   • Total autores: {total_autores}')
print(f'   • Total libros: {total_libros}')
print(f'   • Autores eliminados: {len(ids_eliminados)}')
print(f'   • Libros actualizados: {total_libros_afectados}')

conn.close()

print()
print('='*80)
print('FIN DEL INFORME')
print('='*80)
