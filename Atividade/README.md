# Laboratório XSS — Fluxo de Roubo de Sessão

Ambiente educacional de demonstração de ataques e defesas contra **Cross-Site Scripting (XSS)**,
composto por três serviços isolados em Docker.

> **Aviso:** Este projeto destina-se exclusivamente a fins acadêmicos em ambiente controlado.
> Os payloads e técnicas demonstradas **não devem ser aplicados fora deste laboratório**.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│  Atacante injeta payload XSS no Juice Shop vulnerável       │
│                                                             │
│  Vítima visita a página → script executa no browser →       │
│  dados exfiltrados chegam na Central de Comando em tempo    │
│  real via SSE                                               │
└─────────────────────────────────────────────────────────────┘
```

| Serviço              | Porta  | Descrição                                              |
|----------------------|--------|--------------------------------------------------------|
| `juice-shop`         | `3000` | OWASP Juice Shop original — propositalmente vulnerável |
| `juice-shop-secure`  | `3001` | Versão segura com defesas XSS aplicadas                |
| `command-center`     | `4000` | Servidor C2 — dashboard de capturas em tempo real     |

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e em execução
- [Git](https://git-scm.com/) (para clonar o repositório)

---

## Execução

### 1. Subir todos os serviços

```bash
docker-compose up --build
```

Na primeira execução o Docker baixa a imagem do Juice Shop (~500 MB) e constrói as imagens
locais. As execuções seguintes são mais rápidas.

### 2. Acessar os ambientes

| Ambiente                        | URL                      |
|---------------------------------|--------------------------|
| Juice Shop **vulnerável**       | http://localhost:3000    |
| Juice Shop **seguro**           | http://localhost:3001    |
| Central de Comando (dashboard)  | http://localhost:4000    |

### 3. Parar os serviços

```bash
# Para sem remover os containers
docker-compose stop

# Para e remove containers e rede
docker-compose down
```

---

## Como Usar o Laboratório

### Passo a passo do ataque (ambiente vulnerável)

1. Abra a **Central de Comando** em `localhost:4000`.
2. Na aba **Payloads**, copie o payload do tipo de ataque desejado.
3. Acesse o **Juice Shop vulnerável** em `localhost:3000`.
4. Cole o payload no campo alvo indicado (barra de busca, avaliações ou URL).
5. Observe os dados chegando em tempo real na aba **Capturas** do dashboard.

### Passo a passo da defesa (ambiente seguro)

1. Repita exatamente os mesmos payloads no **Juice Shop seguro** em `localhost:3001`.
2. Verifique que nenhuma captura chega no C2 — os payloads são bloqueados.

---

## Tipos de Ataque Demonstrados

| Tipo         | Vetor de Injeção                | Dado Roubado                       |
|--------------|---------------------------------|------------------------------------|
| Refletido    | Barra de busca (`?q=`)          | Cookie de sessão + JWT             |
| Armazenado   | Descrição de produto (via API)  | Cookie + JWT (dispara em qualquer visita) |
| DOM-Based    | Fragment da URL (`#`)           | Cookie + JWT (sem submit de formulário) |
| Keylogger    | Barra de busca (`?q=`)          | Teclas digitadas (inclui senhas)   |

---

## Defesas Implementadas (juice-shop-secure)

| Defesa                          | Mecanismo                                                       |
|---------------------------------|-----------------------------------------------------------------|
| **Content Security Policy**     | Bloqueia scripts inline e de origens externas                   |
| **Output Encoding**             | Todos os dados do usuário são escapados antes da renderização   |
| **Cookie `HttpOnly` + `SameSite`** | Sessão inacessível via `document.cookie`; proteção CSRF      |
| **`X-Frame-Options: DENY`**     | Impede embedding em iframes (clickjacking)                      |
| **`X-Content-Type-Options`**    | Impede MIME-sniffing pelo navegador                             |
| **`textContent` no DOM**        | Dados dinâmicos inseridos sem interpretar HTML                  |

---

## Estrutura do Projeto

```
.
├── docker-compose.yml          # Orquestra os três serviços
├── juice-shop-secure/
│   ├── Dockerfile
│   ├── server.js               # Express + DOMPurify + cabeçalhos de segurança
│   ├── public/
│   │   ├── index.html
│   │   ├── dom-safe.html       # Demo XSS DOM-Based (seguro)
│   │   └── dom-safe.js
│   └── views/
│       ├── search.html         # Template busca (XSS Refletido)
│       └── reviews.html        # Template avaliações (XSS Armazenado)
└── command-center/
    ├── Dockerfile
    ├── server.js               # C2: endpoints /capture (GET/POST) + SSE + API REST
    └── public/
        ├── index.html          # Dashboard com payloads e capturas ao vivo
        └── dashboard.js
```

---

## Referências

### OWASP

- [OWASP Top 10 — A03:2021 Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP DOM-Based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [OWASP Juice Shop — Projeto Original](https://owasp.org/www-project-juice-shop/)
- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

### Especificações e Padrões

- [MDN Web Docs — Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [MDN Web Docs — HttpOnly Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#httponly)
- [MDN Web Docs — SameSite Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value)
- [MDN Web Docs — X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)
- [MDN Web Docs — textContent vs innerHTML](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)
- [W3C — Server-Sent Events](https://www.w3.org/TR/eventsource/)

### Bibliotecas Utilizadas

- [DOMPurify](https://github.com/cure53/DOMPurify) — sanitização de HTML no servidor (via jsdom)
- [Express.js](https://expressjs.com/) — framework web Node.js
- [JSDOM](https://github.com/jsdom/jsdom) — ambiente DOM para uso do DOMPurify em Node.js
- [bkimminich/juice-shop](https://hub.docker.com/r/bkimminich/juice-shop) — imagem Docker do OWASP Juice Shop

### Artigos e Leituras Complementares

- PortSwigger Web Security Academy — [Cross-site scripting (XSS)](https://portswigger.net/web-security/cross-site-scripting)
- PortSwigger Web Security Academy — [Reflected XSS](https://portswigger.net/web-security/cross-site-scripting/reflected)
- PortSwigger Web Security Academy — [Stored XSS](https://portswigger.net/web-security/cross-site-scripting/stored)
- PortSwigger Web Security Academy — [DOM-based XSS](https://portswigger.net/web-security/cross-site-scripting/dom-based)
