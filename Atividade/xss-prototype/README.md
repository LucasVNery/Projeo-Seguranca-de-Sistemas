# Prototipo XSS — Seguranca de Sistemas

Prototipo educacional inspirado no **OWASP Juice Shop** que demonstra as tres
principais formas de Cross-Site Scripting (XSS) com versoes **vulneraveis** e
**corrigidas** lado a lado.

> AVISO: aplicacao propositalmente insegura. Rode somente em `localhost`.

## Topicos cobertos

| Tipo | Onde fica o payload | Rota vulneravel | Rota corrigida |
|------|---------------------|-----------------|----------------|
| Refletido  | URL (querystring)   | `/reflected/vulnerable`     | `/reflected/safe` |
| Armazenado | Banco / memoria do servidor | `/stored/vulnerable` | `/stored/safe` |
| DOM        | Fragmento da URL (`#...`)   | `/dom-vulnerable.html` | `/dom/safe` |

## Como executar

```bash
cd xss-prototype
npm install
npm start
```

Abra `http://localhost:3000`.

## Defesas aplicadas nas versoes corrigidas

1. **Escape de saida** (`escapeHtml`) converte `< > & " '` para entidades.
2. **Sanitizacao com DOMPurify** quando o usuario realmente pode usar HTML
   (lista branca de tags em comentarios).
3. **Content Security Policy** enviada nas rotas seguras:
   ```
   default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'
   ```
   Bloqueia `<script>` inline e `eval`, mitigando XSS mesmo quando a injecao
   ocorre.
4. **`textContent` no lugar de `innerHTML`** no JavaScript do cliente para a
   versao corrigida do DOM-XSS.

## Roteiro de demonstracao sugerido

1. **Refletido**
   - Acessar `/reflected/vulnerable?q=teste`.
   - Substituir `teste` por `<script>alert(document.cookie)</script>` — alerta
     aparece com o cookie.
   - Repetir em `/reflected/safe` — o navegador exibe o texto literal.
2. **Armazenado**
   - Em `/stored/vulnerable`, postar comentario:
     `<img src=x onerror="alert('Stored')">` — qualquer visita futura dispara
     o alert.
   - Em `/stored/safe`, mesmo payload aparece como texto inofensivo.
3. **DOM**
   - Abrir
     `http://localhost:3000/dom-vulnerable.html#<img src=x onerror=alert(1)>`.
   - Abrir
     `http://localhost:3000/dom/safe#<img src=x onerror=alert(1)>` para
     comparar.

## Impacto demonstravel localmente

- Roubo de `document.cookie` (vazamento de sessao).
- Redirecionamento (`location='http://evil'`).
- Defacement do DOM (`document.body.innerHTML='Hacked'`).
- Keylogger simples (`addEventListener('keydown', e => fetch('/log?k='+e.key))`).

## Estrutura

```
xss-prototype/
├── package.json
├── server.js            Rotas vulneraveis + corrigidas
├── public/
│   ├── index.html       Pagina inicial
│   ├── styles.css
│   ├── dom-vulnerable.html
│   ├── dom-safe.html
│   └── dom-safe.js
└── views/
    ├── reflected.html
    └── stored.html
```

## Relacao com o OWASP Juice Shop

O Juice Shop traz desafios oficiais correspondentes:

- **DOM XSS** (`#/search?q=<iframe...>`).
- **Reflected XSS** (`#/track-result?id=<iframe...>`).
- **Persisted/Stored XSS** (campo de usuario).

Este prototipo replica a essencia desses desafios em escala reduzida,
permitindo focar exclusivamente nos vetores de XSS, no impacto e nas defesas
correspondentes.
