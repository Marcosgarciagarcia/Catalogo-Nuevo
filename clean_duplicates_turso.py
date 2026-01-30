import sqlite3
import requests
import json

# Configuración
LOCAL_DB = r'C:\ProyectosDjango\casateca\db.sqlite3'
TURSO_URL = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA'

def query_turso(sql, params=None):
    """Ejecutar query en Turso"""
    headers = {
        'Authorization': f'Bearer {TURSO_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'statements': [{
            'q': sql,
            'params': params or []
        }]
    }
    
    response = requests.post(TURSO_URL, headers=headers, json=payload, timeout=30)
    
    if response.status_code == 200:
        data = response.json()
        if 'error' in data[0]:
            print(f"❌ Error Turso: {data[0]['error']}")
            return None
        return data[0].get('results', {})
    return None

print('='*80)
print('LIMPIEZA COMPLETA DE DUPLICADOS - LOCAL Y TURSO')
print('='*80)
print()

# PASO 1: Limpiar LOCAL
print('📍 PASO 1: Limpiando base de datos LOCAL')
print('-'*80)

conn = sqlite3.connect(LOCAL_DB)
cursor = conn.cursor()

# Buscar duplicados
cursor.execute('''
    SELECT nombreAutor, COUNT(*) as count 
    FROM core_autores 
    GROUP BY nombreAutor 
    HAVING count > 1 
    ORDER BY nombreAutor
''')

duplicates = cursor.fetchall()
print(f'Duplicados encontrados en LOCAL: {len(duplicates)}')

local_deleted = 0

for autor_nombre, count in duplicates:
    # Obtener todos los registros del autor duplicado
    cursor.execute('''
        SELECT id, enlaceWiki, enlaceWiki2, created, updated 
        FROM core_autores 
        WHERE nombreAutor = ? 
        ORDER BY created ASC
    ''', (autor_nombre,))
    
    registros = cursor.fetchall()
    id_mantener = registros[0][0]
    
    # Recopilar enlaces wiki
    enlaces_wiki1 = set()
    enlaces_wiki2 = set()
    
    for reg in registros:
        if reg[1]:
            enlaces_wiki1.add(reg[1])
        if reg[2]:
            enlaces_wiki2.add(reg[2])
    
    wiki1 = list(enlaces_wiki1)[0] if enlaces_wiki1 else None
    wiki2 = list(enlaces_wiki2)[0] if len(enlaces_wiki2) > 0 else None
    
    # Actualizar el registro que mantenemos
    cursor.execute('''
        UPDATE core_autores 
        SET enlaceWiki = ?, enlaceWiki2 = ?, updated = datetime('now')
        WHERE id = ?
    ''', (wiki1, wiki2, id_mantener))
    
    # Actualizar libros y eliminar duplicados
    ids_eliminar = [reg[0] for reg in registros[1:]]
    
    for id_dup in ids_eliminar:
        cursor.execute('''
            UPDATE core_titulos 
            SET codiAutor_id = ? 
            WHERE codiAutor_id = ?
        ''', (id_mantener, id_dup))
        
        cursor.execute('DELETE FROM core_autores WHERE id = ?', (id_dup,))
        local_deleted += 1

conn.commit()
print(f'✅ LOCAL: {local_deleted} registros duplicados eliminados')

# Verificar LOCAL
cursor.execute('SELECT COUNT(*) FROM core_autores')
total_local = cursor.fetchone()[0]
print(f'📊 Total autores en LOCAL: {total_local}')

conn.close()

# PASO 2: Limpiar TURSO
print()
print('📍 PASO 2: Limpiando base de datos TURSO')
print('-'*80)

# Obtener duplicados de Turso
result = query_turso('''
    SELECT nombreAutor, COUNT(*) as count 
    FROM core_autores 
    GROUP BY nombreAutor 
    HAVING count > 1
''')

if result and result.get('rows'):
    turso_duplicates = result['rows']
    print(f'Duplicados encontrados en TURSO: {len(turso_duplicates)}')
    
    turso_deleted = 0
    
    for dup_row in turso_duplicates:
        autor_nombre = dup_row[0]
        
        # Obtener todos los registros del autor en Turso
        result = query_turso(
            'SELECT id, enlaceWiki, enlaceWiki2, created FROM core_autores WHERE nombreAutor = ? ORDER BY created ASC',
            [autor_nombre]
        )
        
        if result and result.get('rows'):
            registros = result['rows']
            columns = result['columns']
            
            # El primero es el que mantenemos
            id_mantener = registros[0][0]
            
            # Recopilar enlaces
            enlaces_wiki1 = set()
            enlaces_wiki2 = set()
            
            for reg in registros:
                if reg[1]:
                    enlaces_wiki1.add(reg[1])
                if reg[2]:
                    enlaces_wiki2.add(reg[2])
            
            wiki1 = list(enlaces_wiki1)[0] if enlaces_wiki1 else None
            wiki2 = list(enlaces_wiki2)[0] if len(enlaces_wiki2) > 0 else None
            
            # Actualizar el registro que mantenemos
            query_turso(
                'UPDATE core_autores SET enlaceWiki = ?, enlaceWiki2 = ? WHERE id = ?',
                [wiki1, wiki2, id_mantener]
            )
            
            # Actualizar libros y eliminar duplicados
            ids_eliminar = [reg[0] for reg in registros[1:]]
            
            for id_dup in ids_eliminar:
                # Actualizar libros
                query_turso(
                    'UPDATE core_titulos SET codiAutor_id = ? WHERE codiAutor_id = ?',
                    [id_mantener, id_dup]
                )
                
                # Eliminar duplicado
                query_turso('DELETE FROM core_autores WHERE id = ?', [id_dup])
                turso_deleted += 1
    
    print(f'✅ TURSO: {turso_deleted} registros duplicados eliminados')
else:
    print('✅ TURSO: No hay duplicados')

# Verificar TURSO
result = query_turso('SELECT COUNT(*) FROM core_autores')
if result and result.get('rows'):
    total_turso = result['rows'][0][0]
    print(f'📊 Total autores en TURSO: {total_turso}')

print()
print('='*80)
print('LIMPIEZA COMPLETADA')
print('='*80)
print()
print('✅ Ambas bases de datos han sido limpiadas')
print('✅ Ya NO es necesario ejecutar sincronización completa')
print('✅ Ambas BDs deberían tener el mismo número de autores')
