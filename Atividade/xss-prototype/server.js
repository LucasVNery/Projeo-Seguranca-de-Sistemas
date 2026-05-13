const express = require('express');
const path = require('path');
const fs = require('fs');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const storedComments = {
  vulnerable: [
    { author: 'admin', text: 'Bem-vindo a area de comentarios!' }
  ],
  safe: [
    { author: 'admin', text: 'Bem-vindo a area de comentarios!' }
  ]
};

function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function render(viewName, replacements = {}) {
  const file = path.join(__dirname, 'views', viewName);
  let html = fs.readFileSync(file, 'utf8');
  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  return html;
}

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// 1) XSS REFLETIDO
// ============================================================

// VULNERAVEL: injeta input do usuario direto no HTML
app.get('/reflected/vulnerable', (req, res) => {
  const q = req.query.q || '';
  const html = render('reflected.html', {
    MODE: 'VULNERAVEL',
    BADGE_CLASS: 'badge-bad',
    QUERY_RAW: q,                       // <-- sem escape
    ACTION: '/reflected/vulnerable'
  });
  res.send(html);
});

// CORRIGIDO: escape de saida + CSP restritiva
app.get('/reflected/safe', (req, res) => {
  const q = req.query.q || '';
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'"
  );
  const html = render('reflected.html', {
    MODE: 'CORRIGIDO',
    BADGE_CLASS: 'badge-good',
    QUERY_RAW: escapeHtml(q),           // <-- escape de saida
    ACTION: '/reflected/safe'
  });
  res.send(html);
});

// ============================================================
// 2) XSS ARMAZENADO
// ============================================================

app.get('/stored/vulnerable', (_, res) => {
  const items = storedComments.vulnerable
    .map(c => `<li><b>${c.author}</b>: ${c.text}</li>`) // sem escape
    .join('');
  res.send(render('stored.html', {
    MODE: 'VULNERAVEL',
    BADGE_CLASS: 'badge-bad',
    COMMENTS: items,
    ACTION: '/stored/vulnerable'
  }));
});

app.post('/stored/vulnerable', (req, res) => {
  storedComments.vulnerable.push({
    author: req.body.author || 'anonimo',
    text: req.body.text || ''
  });
  res.redirect('/stored/vulnerable');
});

app.get('/stored/safe', (_, res) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'"
  );
  const items = storedComments.safe
    .map(c => {
      const cleanText = DOMPurify.sanitize(c.text, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong'] });
      return `<li><b>${escapeHtml(c.author)}</b>: ${cleanText}</li>`;
    })
    .join('');
  res.send(render('stored.html', {
    MODE: 'CORRIGIDO',
    BADGE_CLASS: 'badge-good',
    COMMENTS: items,
    ACTION: '/stored/safe'
  }));
});

app.post('/stored/safe', (req, res) => {
  storedComments.safe.push({
    author: req.body.author || 'anonimo',
    text: req.body.text || ''
  });
  res.redirect('/stored/safe');
});

// ============================================================
// 3) XSS BASEADO EM DOM
// (paginas estaticas servidas em /public/dom-*.html)
// ============================================================

app.get('/dom/safe', (_, res) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'"
  );
  res.sendFile(path.join(__dirname, 'public', 'dom-safe.html'));
});

// Reset para limpar comentarios
app.post('/reset', (_, res) => {
  storedComments.vulnerable = [{ author: 'admin', text: 'Bem-vindo a area de comentarios!' }];
  storedComments.safe = [{ author: 'admin', text: 'Bem-vindo a area de comentarios!' }];
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`\n  XSS Prototype rodando em http://localhost:${PORT}\n`);
  console.log('  AVISO: aplicacao propositalmente vulneravel. Use apenas em ambiente local.\n');
});
