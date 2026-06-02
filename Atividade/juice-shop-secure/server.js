'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

const { window: purifyWindow } = new JSDOM('');
const DOMPurify = createDOMPurify(purifyWindow);

// Cabeçalhos de segurança aplicados em todas as respostas
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  next();
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Cookie de sessão com flags de segurança
app.use((req, res, next) => {
  if (!req.cookies['juice-session']) {
    res.cookie('juice-session', 'demo-token-' + Date.now(), {
      httpOnly: true,   // Inacessível via document.cookie
      // secure: true,  // Ativar em produção com HTTPS
      sameSite: 'strict',
      maxAge: 3600000,
    });
  }
  next();
});

function render(templatePath, vars) {
  let html = fs.readFileSync(templatePath, 'utf-8');
  for (const [k, v] of Object.entries(vars)) {
    html = html.replaceAll(`{{${k}}}`, v);
  }
  return html;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const reviews = [];

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// XSS Refletido — seguro: entrada escapada antes de inserir no HTML
app.get('/search', (req, res) => {
  const raw = String(req.query.q || '');
  const safe = escapeHtml(raw);
  const html = render(path.join(__dirname, 'views', 'search.html'), {
    QUERY: safe,
    HAS_QUERY: raw ? 'block' : 'none',
  });
  res.send(html);
});

// XSS Armazenado — seguro: dados escapados na renderização, não no armazenamento
app.get('/reviews', (req, res) => {
  const items = reviews.length === 0
    ? '<p class="empty-msg">Nenhuma avaliação ainda.</p>'
    : reviews
        .map(
          r => `<div class="review-card">
            <div class="review-header">
              <strong>${escapeHtml(r.author)}</strong>
              <time>${escapeHtml(r.date)}</time>
            </div>
            <p>${escapeHtml(r.text)}</p>
          </div>`
        )
        .join('');
  const html = render(path.join(__dirname, 'views', 'reviews.html'), {
    REVIEWS: items,
  });
  res.send(html);
});

app.post('/reviews', (req, res) => {
  const author = String(req.body.author || 'Anônimo').slice(0, 80);
  const text = String(req.body.text || '').slice(0, 400);
  reviews.push({
    author,
    text,
    date: new Date().toLocaleDateString('pt-BR'),
  });
  res.redirect('/reviews');
});

app.post('/reviews/reset', (req, res) => {
  reviews.length = 0;
  res.redirect('/reviews');
});

// XSS DOM-Based — seguro: arquivo estático usa textContent no client-side JS
app.get('/dom', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dom-safe.html'));
});

app.listen(PORT, () => {
  console.log(`\n Juice Shop Seguro rodando em http://localhost:${PORT}\n`);
});
