import sqlite3
from datetime import datetime

# Conectar a la base de datos
conn = sqlite3.connect(r'C:\ProyectosDjango\casateca\db.sqlite3')
cursor = conn.cursor()

print('='*60)
print('LIMPIEZA DE AUTORES DUPLICADOS')
print('='*60)

# Buscar autores duplicados
cursor.execute('''
    SELECT nombreAutor, COUNT(*) as count 
    FROM core_autores 
    GROUP BY nombreAutor 
    HAVING count > 1 
    ORDER BY nombreAutor
''')

duplicates = cursor.fetchall()

if not duplicates:
    print('\n✅ No hay autores duplicados para limpiar')
    conn.close()
    exit()

print(f'\n📊 Autores duplicados a procesar: {len(duplicates)}\n')

merged_count = 0
deleted_count = 0

for autor_nombre, count in duplicates:
    print(f'\n🔍 Procesando: {autor_nombre} ({count} registros)')
    
    # Obtener todos los registros del autor duplicado
    cursor.execute('''
        SELECT id, enlaceWiki, enlaceWiki2, created, updated 
        FROM core_autores 
        WHERE nombreAutor = ? 
        ORDER BY created ASC
    ''', (autor_nombre,))
    
    registros = cursor.fetchall()
    
    # El primero (más antiguo) será el que mantengamos
    id_mantener = registros[0][0]
    created_mantener = registros[0][3]
    
    # Recopilar todos los enlaces wiki (sin duplicar)
    enlaces_wiki1 = set()
    enlaces_wiki2 = set()
    
    for reg in registros:
        if reg[1]:  # enlaceWiki
            enlaces_wiki1.add(reg[1])
        if reg[2]:  # enlaceWiki2
            enlaces_wiki2.add(reg[2])
    
    # Convertir a lista y tomar los primeros
    wiki1 = list(enlaces_wiki1)[0] if enlaces_wiki1 else None
    wiki2 = list(enlaces_wiki2)[0] if len(enlaces_wiki2) > 0 else None
    
    print(f'  ✓ Manteniendo ID: {id_mantener} (creado: {created_mantener})')
    
    # Actualizar el registro que mantenemos con los enlaces wiki
    cursor.execute('''
        UPDATE core_autores 
        SET enlaceWiki = ?, enlaceWiki2 = ?, updated = datetime('now')
        WHERE id = ?
    ''', (wiki1, wiki2, id_mantener))
    
    # Actualizar libros que apuntan a los IDs duplicados
    ids_eliminar = [reg[0] for reg in registros[1:]]
    
    for id_dup in ids_eliminar:
        # Actualizar libros que usan este autor duplicado
        cursor.execute('''
            UPDATE core_titulos 
            SET codiAutor_id = ? 
            WHERE codiAutor_id = ?
        ''', (id_mantener, id_dup))
        
        libros_actualizados = cursor.rowcount
        if libros_actualizados > 0:
            print(f'  ↳ {libros_actualizados} libro(s) actualizados desde ID {id_dup} → {id_mantener}')
        
        # Eliminar el registro duplicado
        cursor.execute('DELETE FROM core_autores WHERE id = ?', (id_dup,))
        deleted_count += 1
        print(f'  ✗ Eliminado ID: {id_dup}')
    
    merged_count += 1

# Confirmar cambios
conn.commit()

print('\n' + '='*60)
print('RESUMEN DE LIMPIEZA')
print('='*60)
print(f'✅ Autores fusionados: {merged_count}')
print(f'🗑️  Registros eliminados: {deleted_count}')

# Verificar resultado
cursor.execute('SELECT COUNT(*) FROM core_autores')
total_final = cursor.fetchone()[0]

cursor.execute('SELECT COUNT(DISTINCT nombreAutor) FROM core_autores')
unicos_final = cursor.fetchone()[0]

print(f'\n📊 Estado final:')
print(f'   Total registros: {total_final}')
print(f'   Autores únicos: {unicos_final}')
print(f'   Duplicados restantes: {total_final - unicos_final}')

conn.close()

print('\n✅ Limpieza completada')
print('\n⚠️  IMPORTANTE: Ejecuta sincronización completa para actualizar Turso')
