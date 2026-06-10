'use strict';

// Botão "Copiar" dos blocos de payload de demonstração.
// Servido de 'self' — permitido pelo CSP (script-src 'self').
// pre.textContent entrega o payload já decodificado (< e > reais),
// pronto para colar no campo vulnerável.

document.querySelectorAll('.btn-copy').forEach((btn) => {
  btn.addEventListener('click', () => {
    const pre = document.getElementById(btn.dataset.target);
    if (!pre) return;
    const text = pre.textContent.trim();

    const done = () => {
      const original = btn.textContent;
      btn.textContent = 'Copiado!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 1500);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  });
});

// Fallback para contextos sem Clipboard API (ex.: sem HTTPS)
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { /* noop */ }
  document.body.removeChild(ta);
}
