/**
 * Arranque local completo: API (3001) + Vite (5173), sin Vercel CLI.
 * Uso: node --use-system-ca scripts/dev-local.js
 *      o: npm run local
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const useSystemCa = process.execArgv.includes('--use-system-ca')
  || String(process.env.NODE_OPTIONS || '').includes('--use-system-ca');

const nodeArgs = useSystemCa ? ['--use-system-ca'] : [];
const children = [];

function start(label, command, args) {
  console.log(`[local] Iniciando ${label}…`);
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_OPTIONS: useSystemCa
        ? [process.env.NODE_OPTIONS, '--use-system-ca'].filter(Boolean).join(' ')
        : process.env.NODE_OPTIONS,
    },
  });
  children.push(child);
  child.on('exit', (code, signal) => {
    if (signal) return;
    if (code && code !== 0) {
      console.error(`[local] ${label} salió con código ${code}`);
      shutdown(code);
    }
  });
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    try {
      child.kill();
    } catch (_) {}
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start('API', 'node', [...nodeArgs, 'scripts/local-api-server.js']);

// Dar un momento a la API antes de Vite
setTimeout(() => {
  start('Vite', 'npx', ['vite', '--port', '5173']);
  console.log('');
  console.log('────────────────────────────────────────');
  console.log('  App:  http://localhost:5173');
  console.log('  API:  http://127.0.0.1:3001');
  console.log('  Health: http://localhost:5173/api/health');
  console.log('────────────────────────────────────────');
  console.log('');
}, 800);
