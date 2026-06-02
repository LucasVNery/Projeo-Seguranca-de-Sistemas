'use strict';

function updateOutput() {
  const fragment = location.hash.slice(1);
  const decoded = decodeURIComponent(fragment);
  const output = document.getElementById('output');
  const urlText = document.getElementById('url-text');

  // SAFE: textContent nunca processa HTML — payload vira texto literal
  output.textContent = decoded || 'Nenhuma categoria selecionada.';

  if (urlText) {
    urlText.textContent = location.href;
  }
}

updateOutput();
window.addEventListener('hashchange', updateOutput);
