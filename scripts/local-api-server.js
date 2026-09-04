/**
 * Servidor API local (sin Vercel CLI).
 * Lee .env.local, carga los handlers de /api y escucha en el puerto 3001.
 * Uso: node --use-system-ca scripts/local-api-server.js
 * Vite (puerto 5173) hace proxy de /api → este servidor.
 */

import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const PORT = Number(process.env.API_PORT || 3001);

function loadEnv() {
  const envPath = path.join(rootDir, '.env.local');
  if (!existsSync(envPath)) {
    console.warn('Aviso: no se encuentra .env.local');
    return;
  }
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv();

function createRes(rawRes) {
  let statusCode = 200;
  const headers = {};
  return {
    statusCode,
    setHeader(name, value) {
      headers[name] = value;
    },
    status(code) {
      statusCode = code;
      this.statusCode = code;
      return this;
    },
    json(body) {
      const payload = JSON.stringify(body ?? null);
      headers['Content-Type'] = headers['Content-Type'] || 'application/json; charset=utf-8';
      rawRes.writeHead(statusCode, headers);
      rawRes.end(payload);
    },
    end(body) {
      rawRes.writeHead(statusCode, headers);
      rawRes.end(body ?? '');
    },
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return undefined;
  const ct = req.headers['content-type'] || '';
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function parseUrl(reqUrl) {
  const u = new URL(reqUrl, `http://127.0.0.1:${PORT}`);
  const query = Object.fromEntries(u.searchParams.entries());
  return { pathname: u.pathname, query };
}

/** Mapea ruta URL → módulo handler (estilo Vercel serverless). */
async function resolveHandler(pathname, query) {
  // Rewrites equivalentes a vercel.json
  if (pathname === '/api/lookup-video') {
    query.route = 'lookup-video';
    return { modulePath: 'api/external.js', query };
  }
  if (pathname === '/api/lookup-isbn') {
    query.route = 'lookup-isbn';
    return { modulePath: 'api/external.js', query };
  }
  if (pathname === '/api/lookup-disc') {
    query.route = 'lookup-disc';
    return { modulePath: 'api/external.js', query };
  }
  if (pathname === '/api/upload-cover') {
    query.route = 'upload-cover';
    return { modulePath: 'api/external.js', query };
  }
  if (pathname === '/api/external') {
    return { modulePath: 'api/external.js', query };
  }
  if (pathname === '/api/media' || pathname.startsWith('/api/media/')) {
    if (pathname.startsWith('/api/media/') && pathname.length > '/api/media/'.length) {
      query.path = pathname.slice('/api/media/'.length);
    }
    return { modulePath: 'api/media.js', query };
  }
  if (pathname === '/api/catalog-types') {
    return { modulePath: 'api/catalog-types.js', query };
  }
  if (pathname === '/api/sync-from-local') {
    return { modulePath: 'api/sync-from-local.js', query };
  }
  if (pathname === '/api/health') {
    return { modulePath: 'api/health.js', query };
  }
  if (pathname === '/api/auth/login') {
    return { modulePath: 'api/auth/login.js', query };
  }
  if (pathname === '/api/auth/verify') {
    return { modulePath: 'api/auth/verify.js', query };
  }
  return null;
}

const handlerCache = new Map();

async function loadHandler(modulePath) {
  if (handlerCache.has(modulePath)) return handlerCache.get(modulePath);
  const abs = path.join(rootDir, modulePath);
  const mod = await import(pathToFileURL(abs).href);
  const handler = mod.default;
  if (typeof handler !== 'function') {
    throw new Error(`Handler sin export default: ${modulePath}`);
  }
  handlerCache.set(modulePath, handler);
  return handler;
}

const server = createServer(async (req, rawRes) => {
  rawRes.setHeader('Access-Control-Allow-Origin', '*');
  rawRes.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  rawRes.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    rawRes.writeHead(200);
    rawRes.end();
    return;
  }

  try {
    const { pathname, query } = parseUrl(req.url || '/');
    const resolved = await resolveHandler(pathname, query);
    if (!resolved) {
      rawRes.writeHead(404, { 'Content-Type': 'application/json' });
      rawRes.end(JSON.stringify({ error: `Ruta no encontrada: ${pathname}` }));
      return;
    }

    const handler = await loadHandler(resolved.modulePath);
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method || '')
      ? await readBody(req)
      : undefined;

    const vercelReq = {
      method: req.method,
      headers: req.headers,
      query: resolved.query,
      body,
      url: req.url,
    };
    const vercelRes = createRes(rawRes);
    await handler(vercelReq, vercelRes);
  } catch (err) {
    console.error('[local-api]', err);
    if (!rawRes.headersSent) {
      rawRes.writeHead(500, { 'Content-Type': 'application/json' });
      rawRes.end(JSON.stringify({ error: err?.message || 'Error en API local' }));
    }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[local-api] Escuchando en http://127.0.0.1:${PORT}`);
  console.log(`[local-api] Turso: ${process.env.TURSO_DATABASE_URL ? 'OK' : 'FALTA'}`);
  console.log(`[local-api] JWT: ${process.env.JWT_SECRET ? 'OK' : 'FALTA'}`);
  console.log(`[local-api] TMDb: ${process.env.TMDB_API_KEY ? 'OK' : 'FALTA'}`);
});
