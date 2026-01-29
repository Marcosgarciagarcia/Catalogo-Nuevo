import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function createSchema() {
  console.log('📋 Creando esquema de base de datos...');
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS libros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ean TEXT NOT NULL UNIQUE,
      titulo TEXT NOT NULL,
      nombre_autor TEXT NOT NULL,
      portada_public_id TEXT,
      portada_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  await db.execute('CREATE INDEX IF NOT EXISTS idx_ean ON libros(ean);');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_autor ON libros(nombre_autor);');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_titulo ON libros(titulo);');
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log('✅ Esquema creado exitosamente');
}

async function migrateData() {
  console.log('📖 Leyendo datos del JSON...');
  
  const jsonPath = path.join(__dirname, 'src', 'assets', 'data', 'Titulo_Autor.json');
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  
  console.log(`📚 Encontrados ${jsonData.length} libros para migrar`);
  
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  
  console.log('💾 Insertando datos en Turso...');
  
  for (let i = 0; i < jsonData.length; i++) {
    const libro = jsonData[i];
    
    try {
      await db.execute({
        sql: `
          INSERT INTO libros (ean, titulo, nombre_autor, portada_public_id, portada_url)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [
          libro.EAN || '',
          libro.titulo || '',
          libro.nombreAutor || '',
          libro.portada?.publicId || null,
          libro.portada?.url || null
        ]
      });
      inserted++;
      
      if ((i + 1) % 100 === 0) {
        console.log(`   Progreso: ${i + 1}/${jsonData.length} (${Math.round((i + 1) / jsonData.length * 100)}%)`);
      }
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        skipped++;
      } else {
        console.error(`❌ Error insertando libro ${libro.EAN}:`, error.message);
        errors++;
      }
    }
  }
  
  console.log('\n📊 Resumen de migración:');
  console.log(`   Total en JSON: ${jsonData.length}`);
  console.log(`   ✅ Insertados: ${inserted}`);
  console.log(`   ⏭️  Omitidos (duplicados): ${skipped}`);
  console.log(`   ❌ Errores: ${errors}`);
  
  return { total: jsonData.length, inserted, skipped, errors };
}

async function verifyMigration() {
  console.log('\n✅ Verificando integridad de datos...');
  
  const countResult = await db.execute('SELECT COUNT(*) as total FROM libros');
  const totalEnBD = countResult.rows[0].total;
  
  console.log(`   Total de registros en Turso: ${totalEnBD}`);
  
  const sampleResult = await db.execute('SELECT * FROM libros LIMIT 5');
  console.log('\n📖 Primeros 5 registros en Turso:');
  console.table(sampleResult.rows);
  
  const authorsResult = await db.execute('SELECT COUNT(DISTINCT nombre_autor) as total FROM libros');
  console.log(`\n👥 Total de autores únicos: ${authorsResult.rows[0].total}`);
  
  return totalEnBD;
}

async function migrate() {
  console.log('🚀 Iniciando migración de JSON a Turso...\n');
  
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('❌ Error: Faltan credenciales de Turso');
    console.error('   Por favor, configura TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en .env.local');
    process.exit(1);
  }
  
  try {
    await createSchema();
    const stats = await migrateData();
    const totalVerified = await verifyMigration();
    
    if (totalVerified === stats.inserted + stats.skipped) {
      console.log('\n🎉 ¡Migración completada exitosamente!');
    } else {
      console.log('\n⚠️ Advertencia: Hay diferencias en los totales. Revisa los datos.');
    }
    
    await db.execute({
      sql: 'INSERT OR REPLACE INTO schema_migrations (version, name) VALUES (?, ?)',
      args: [1, 'initial_migration_from_json']
    });
    
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  }
}

migrate().catch(console.error);
