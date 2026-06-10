'use strict';

// DEMONSTRAÇÃO SEGURA
// Este script é servido de 'self' (permitido pelo CSP) e serve apenas para
// EXPLICAR o ataque. Ele conta localmente quantas teclas um keylogger TERIA
// capturado, mas NÃO faz nenhum fetch()/Image() para o C2: o contador de
// "Enviadas ao C2" permanece sempre 0.
//
// O ponto pedagógico: no ambiente vulnerável o payload XSS instalaria este
// listener a partir de código INJETADO. Aqui, o CSP + escapeHtml impedem que
// qualquer script injetado execute, então um keylogger real nunca existiria.

(function () {
  let captured = 0;
  const sentToC2 = 0; // nunca muda — nada é exfiltrado

  const status = document.getElementById('kl-status');
  const countEl = document.getElementById('kl-count');
  const sentEl = document.getElementById('kl-sent');
  const fields = [
    document.getElementById('kl-email'),
    document.getElementById('kl-pass'),
  ].filter(Boolean);

  fields.forEach((field) => {
    field.addEventListener('keydown', (e) => {
      // Conta apenas teclas "imprimíveis", igual faria um keylogger real
      if (e.key && e.key.length === 1) {
        captured += 1;
        countEl.textContent = String(captured);
        sentEl.textContent = String(sentToC2); // sempre 0
        status.textContent =
          'Um keylogger TERIA registrado ' + captured + ' tecla(s) — mas o ' +
          'payload XSS foi bloqueado, então nada foi capturado nem enviado.';
      }
    });
  });
})();
