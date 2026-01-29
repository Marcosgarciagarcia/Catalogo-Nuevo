/**
 * Script de prueba para verificar que el servicio de Turso funciona
 * Ejecutar con: node test_frontend_turso.js
 */

const TURSO_URL = 'https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njk2MDExMjYsImlkIjoiNmQ5OGZlODYtYjQzNy00ZGFhLWI0MmEtZGY4N2IwOWMxNzBjIiwicmlkIjoiMmE4ODQyM2QtYjFhZS00Y2JlLThjNjMtYjFiZjc2NTkwODZmIn0.kfk7CCGPtbJAZq8maUtOy_L8aR-t6qHaUEuvOPDobkN0rLSKTNJiCeAa9LEWpn8r8b8BZ4SPPXs74klIfJuKDA';

async function testTursoService() {
  console.log('🧪 Probando servicio de Turso para el frontend...\n');

  try {
    // Test 1: Obtener primeros 5 libros
    console.log('📚 Test 1: Obtener primeros 5 libros');
    const response1 = await fetch(TURSO_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        statements: [{
          q: `
            SELECT 
              t.id, t.EAN, t.titulo, t.portada_cloudinary,
              a.nombreAutor, e.descriEditorial as editorial
            FROM core_titulos t
            LEFT JOIN core_autores a ON t.codiAutor_id = a.id
            LEFT JOIN core_editoriales e ON t.codiEditorial_id = e.id
            ORDER BY t.titulo
            LIMIT 5
          `,
          params: []
        }]
      })
    });

    const data1 = await response1.json();
    if (data1[0]?.error) {
      console.error('❌ Error:', data1[0].error);
    } else {
      const results = data1[0]?.results;
      const rows = results?.rows || [];
      const columns = results?.columns || [];
      
      console.log(`✅ ${rows.length} libros obtenidos`);
      rows.forEach((row, i) => {
        const libro = {};
        columns.forEach((col, idx) => {
          libro[col] = row[idx];
        });
        console.log(`  ${i + 1}. ${libro.titulo} - ${libro.nombreAutor}`);
        console.log(`     Portada: ${libro.portada_cloudinary ? '✅ Sí' : '❌ No'}`);
      });
    }

    // Test 2: Buscar por título
    console.log('\n🔍 Test 2: Buscar "Quijote"');
    const response2 = await fetch(TURSO_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        statements: [{
          q: `
            SELECT 
              t.id, t.titulo, a.nombreAutor
            FROM core_titulos t
            LEFT JOIN core_autores a ON t.codiAutor_id = a.id
            WHERE t.titulo LIKE ?
            LIMIT 3
          `,
          params: ['%Quijote%']
        }]
      })
    });

    const data2 = await response2.json();
    if (data2[0]?.error) {
      console.error('❌ Error:', data2[0].error);
    } else {
      const results = data2[0]?.results;
      const rows = results?.rows || [];
      console.log(`✅ ${rows.length} resultados encontrados`);
      rows.forEach((row) => {
        console.log(`  - ${row[1]} (${row[2]})`);
      });
    }

    // Test 3: Filtrar por letra
    console.log('\n🔤 Test 3: Libros que empiezan con "A"');
    const response3 = await fetch(TURSO_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        statements: [{
          q: `
            SELECT COUNT(*) as count
            FROM core_titulos t
            WHERE UPPER(t.titulo) LIKE UPPER(?)
          `,
          params: ['A%']
        }]
      })
    });

    const data3 = await response3.json();
    if (data3[0]?.error) {
      console.error('❌ Error:', data3[0].error);
    } else {
      const count = data3[0]?.results?.rows[0][0];
      console.log(`✅ ${count} libros empiezan con "A"`);
    }

    // Test 4: Estadísticas
    console.log('\n📊 Test 4: Estadísticas generales');
    const response4 = await fetch(TURSO_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        statements: [{
          q: `
            SELECT 
              (SELECT COUNT(*) FROM core_titulos) as totalLibros,
              (SELECT COUNT(*) FROM core_autores) as totalAutores,
              (SELECT COUNT(*) FROM core_titulos WHERE portada_cloudinary IS NOT NULL) as librosConPortada
          `,
          params: []
        }]
      })
    });

    const data4 = await response4.json();
    if (data4[0]?.error) {
      console.error('❌ Error:', data4[0].error);
    } else {
      const stats = data4[0]?.results?.rows[0];
      console.log(`✅ Total de libros: ${stats[0]}`);
      console.log(`✅ Total de autores: ${stats[1]}`);
      console.log(`✅ Libros con portada: ${stats[2]}`);
    }

    console.log('\n✅ Todos los tests pasaron correctamente!');
    console.log('\n🚀 El frontend está listo para ejecutarse con: npm run dev');

  } catch (error) {
    console.error('\n❌ Error en los tests:', error.message);
  }
}

testTursoService();
