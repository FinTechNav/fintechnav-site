#!/usr/bin/env node
// Zero-dependency Local Dev Server for fintechnav-site (/ and /stock) + /netlify/functions/*.js
// Run: npm run dev:stock

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../dist');
const FUNCTIONS_DIR = path.join(ROOT_DIR, 'netlify', 'functions');
const PORT = process.env.PORT || 4173;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Route /api/* or /.netlify/functions/* to Netlify Serverless Functions
  if (pathname.startsWith('/api/') || pathname.startsWith('/.netlify/functions/')) {
    const fnName = pathname
      .replace(/^\/api\//, '')
      .replace(/^\/\.netlify\/functions\//, '')
      .split('/')[0];
    const legacyName = fnName === 'send-email' ? fnName : null;
    const fnPath = legacyName ? path.resolve(__dirname, '../netlify/functions/send-email.js') : null;
    // Identity requires the deployed Netlify runtime. Never add a development
    // bypass that might accidentally ship to production.
    if (!fnPath || !fs.existsSync(fnPath)) {
      res.writeHead(401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: false, error: 'Stock sign-in is available on the deployed site. Run npm run test:security for mocked API tests.' }));
      return;
    }

    let body = '';
    for await (const chunk of req) body += chunk;

    const queryStringParameters = Object.fromEntries(parsedUrl.searchParams.entries());
    delete require.cache[require.resolve(fnPath)];
    const mod = require(fnPath);
    const result = await mod.handler({
      httpMethod: req.method,
      headers: req.headers,
      queryStringParameters,
      body
    });

    res.writeHead(result.statusCode || 200, result.headers || { 'Content-Type': 'application/json' });
    res.end(result.body || '');
    return;
  }

  let relPath = pathname;
  if (relPath === '/') relPath = '/index.html';
  else if (relPath === '/stock' || relPath === '/stock/') relPath = '/stock/index.html';

  const safePath = path.resolve(ROOT_DIR, '.' + relPath);
  if (!safePath.startsWith(ROOT_DIR + path.sep) || relPath.split('/').some((part) => part.startsWith('.'))) {
    res.writeHead(404); res.end('Not found'); return;
  }
  let filePath = safePath;
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }

  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Serve built assets only (run npm run build first). FinTechNav Bio (http://127.0.0.1:${PORT}/) & Stock App (http://127.0.0.1:${PORT}/stock) running`);
});
