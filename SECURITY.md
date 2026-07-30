# Segurança, Athena (frontend + backend)

Guia prático. Segue o que o time definiu e fecha os furos clássicos de vazamento
de dados e de custo (requisições em massa na sua conta).

## 🔴 AÇÃO IMEDIATA, rotacionar segredos expostos
As credenciais coladas em chat/documentos estão comprometidas. Gere novas e
revogue as antigas ANTES de subir:

| Segredo | Onde rotacionar |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys → revoke + create |
| `OPENAI_API_KEY` | platform.openai.com → API keys → revoke + create |
| `MCP_AUTH_TOKEN` | gerar novo token e atualizar nos 4 MCPs + no backend + no front (`ATHENA_BACKEND_TOKEN`) |
| `CLOUDSQL_PASSWORD` | Cloud SQL → usuário `athena_user` → redefinir senha |
| `db-sql-om-service-account.json` | IAM → chave da service account → revogar e emitir nova |

Depois disso, os segredos vivem **só** no Secret Manager / env do servidor, nunca em git, nunca no navegador.

## Princípio central do frontend
O navegador **não guarda segredo nenhum**. Todo acesso ao backend passa pelo
proxy server-side `app/api/athena/[...path]/route.ts`, que injeta o
`Authorization: Bearer` a partir de `ATHENA_BACKEND_TOKEN` (env de servidor).
Se o token fosse `NEXT_PUBLIC_...`, qualquer um leria no DevTools e bateria
direto no backend, custo e vazamento. Aqui isso é impossível.

## Checklist (o que já está no projeto)
- [x] **Nenhuma var `NEXT_PUBLIC_` com segredo.** Token e URLs ficam em env de servidor.
- [x] **Sessão em cookie `httpOnly` + `secure` + `sameSite=lax`**, assinada com HMAC (`lib/session.ts`). JS não lê o cookie → imune a roubo por XSS.
- [x] **Nada de identidade/PII em `localStorage`.** Não guardamos e-mail, token ou dados pessoais no navegador.
- [x] **`sessionStorage`**: o app não grava dados sensíveis ali; o navegador já o limpa quando a aba fecha.
- [x] **Source maps de produção desligados** (`productionBrowserSourceMaps:false`) → o `.tsx` não fica exposto no inspecionar.
- [x] **Cabeçalhos de segurança** (`next.config.mjs`): CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.
- [x] **Rate limit por IP** no proxy (`RATE_LIMIT_PER_MINUTE`, padrão 30/min), barra criação em massa e flood.
- [x] **Allowlist de endpoints** no proxy: só os 9 endpoints reais passam.
- [x] **Auditoria só para admin**: o proxy bloqueia `/audit` para quem não está em `ADMIN_EMAILS` (o backend revalida, defesa em profundidade).
- [x] **`.env*` e `*-service-account.json` no `.gitignore`.**

## O que falta para produção (recomendado)
- [ ] **Login real com Google OAuth** (NextAuth) restrito ao domínio, no lugar do login-stub de dev. Ver DEPLOY-GCP.md.
- [ ] **Rate limit distribuído**: o do proxy é por instância. Somar **Cloud Armor** (WAF + rate limit por IP) na frente da Cloud Run, e limite de contas/requisições no backend.
- [ ] **CSP com nonce** em vez de `'unsafe-inline'` no `script-src` (endurecimento).
- [ ] **CORS do backend restrito** ao domínio do front (hoje `allow_origins=['*']` no `main.py`, trocar pelo domínio real).
- [ ] **Budget alert no GCP**: alarme de custo (ex.: > R$/USD por dia) para não ser surpreendido.
- [ ] **Backend nunca em modo `DEBUG=true` em produção** (o middleware de auth aceita tudo em debug).
