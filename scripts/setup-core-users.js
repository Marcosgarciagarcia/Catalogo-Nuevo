/**
 * Script para crear la tabla core_users en Turso y el primer usuario (o añadir más).
 * Uso:
 *   node --env-file=.env.local scripts/setup-core-users.js crear
 *   node --env-file=.env.local scripts/setup-core-users.js crear admin miPassword admin@ejemplo.com
 *   node --env-file=.env.local scripts/setup-core-users.js añadir usuario contraseña email@opcional.com
 *
 * Requiere .env.local con TURSO_DATABASE_URL y TURSO_AUTH_TOKEN.
 */

import { readFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import bcrypt from 'bcryptjs';

const ENV_FILE = '.env.local';

function loadEnv() {
  if (!existsSync(ENV_FILE)) {
    console.error(`No se encuentra ${ENV_FILE}. Cópialo desde .env.example y rellena TURSO_DATABASE_URL y TURSO_AUTH_TOKEN.`);
    process.exit(1);
  }
  const content = readFileSync(ENV_FILE, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    }
  }
}

async function executeQuery(sql, params = []) {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) {
    console.error('Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN en .env.local');
    process.exit(1);
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ statements: [{ q: sql, params }] }),
  });
  if (!res.ok) throw new Error(`Turso HTTP ${res.status}`);
  const data = await res.json();
  if (data[0]?.error) throw new Error(data[0].error);
  return data[0]?.results;
}

function question(rl, text) {
  return new Promise((resolve) => rl.question(text, resolve));
}

async function main() {
  loadEnv();

  const subcommand = process.argv[2];
  if (!subcommand || !['crear', 'añadir', 'anadir'].includes(subcommand)) {
    console.log('Uso: node --env-file=.env.local scripts/setup-core-users.js crear [usuario] [contraseña] [email]');
    console.log('     node --env-file=.env.local scripts/setup-core-users.js añadir [usuario] [contraseña] [email]');
    process.exit(1);
  }

  const isCrear = subcommand === 'crear';
  let username = process.argv[3];
  let password = process.argv[4];
  let email = process.argv[5] || '';

  if (!username || !password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    username = (await question(rl, 'Usuario: ')).trim();
    password = await question(rl, 'Contraseña: ');
    if (isCrear) email = (await question(rl, 'Email (opcional): ')).trim();
    rl.close();
  }

  if (!username || !password) {
    console.error('Usuario y contraseña son obligatorios.');
    process.exit(1);
  }

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS core_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      is_staff INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0
    );
  `;

  try {
    await executeQuery(createTableSql);
    console.log('Tabla core_users comprobada/creada.');

    const passwordHash = bcrypt.hashSync(password, 10);
    const isStaff = isCrear ? 1 : 0;
    const isAdmin = isCrear ? 1 : 0;

    await executeQuery(
      `INSERT INTO core_users (username, password_hash, email, is_staff, is_admin) VALUES (?, ?, ?, ?, ?)`,
      [username, passwordHash, email || null, isStaff, isAdmin]
    );
    console.log(`Usuario "${username}" creado correctamente.`);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      console.error(`El usuario "${username}" ya existe.`);
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}

main();
