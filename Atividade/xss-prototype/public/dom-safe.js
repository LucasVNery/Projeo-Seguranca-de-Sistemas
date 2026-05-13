// CORRIGIDO: textContent escapa automaticamente
const nome = decodeURIComponent(location.hash.slice(1) || 'visitante');
document.getElementById('saudacao').textContent = nome;
