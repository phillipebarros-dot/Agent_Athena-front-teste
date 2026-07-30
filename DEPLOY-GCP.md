# Deploy no GCP, Athena (frontend Next.js)

O frontend sobe na **Cloud Run**, a mesma infra do backend e dos MCPs. Passo a passo.

## 0. Pré-requisitos
- `gcloud` instalado e logado (`gcloud auth login`), projeto setado
  (`gcloud config set project SEU_PROJETO`).
- Backend Python já no ar (outra Cloud Run), anote a URL dele.
- Segredos **rotacionados** (ver SECURITY.md).

## 1. Rodar local primeiro
```bash
cd athena-web
cp .env.example .env.local     # preencha os valores (sem aspas)
#   ATHENA_BACKEND_URL=https://athena-backend-xxxxx.us-central1.run.app
#   ATHENA_BACKEND_TOKEN=<novo MCP_AUTH_TOKEN>
#   SESSION_SECRET=<node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))">
#   ATHENA_DEV_LOGIN=true
npm install
npm run dev        # http://localhost:3000  → /login → clica → /chat
```
Sem `ATHENA_BACKEND_URL`, o app abre e navega em **modo mock** (as telas usam os
dados de exemplo). Com a URL + token, as telas passam a falar com o backend real.

## 2. Guardar segredos no Secret Manager
```bash
echo -n "https://athena-backend-xxxxx.us-central1.run.app" | gcloud secrets create ATHENA_BACKEND_URL --data-file=-
echo -n "SEU_NOVO_TOKEN"  | gcloud secrets create ATHENA_BACKEND_TOKEN --data-file=-
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))" | tr -d '\n' | gcloud secrets create SESSION_SECRET --data-file=-
```

## 3. Build + deploy (a partir do fonte)
```bash
cd athena-web
gcloud run deploy athena-web \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-secrets=ATHENA_BACKEND_URL=ATHENA_BACKEND_URL:latest,ATHENA_BACKEND_TOKEN=ATHENA_BACKEND_TOKEN:latest,SESSION_SECRET=SESSION_SECRET:latest \
  --set-env-vars=ALLOWED_EMAIL_DOMAINS=grupoom.com.br\,opusmultipla.com.br,ADMIN_EMAILS=andrei@grupoom.com.br\,phillipe.barros@grupoom.com.br\,camilo.ferreira@grupoom.com.br\,gabriel.oliveira@grupoom.com.br,RATE_LIMIT_PER_MINUTE=30,ATHENA_DEV_LOGIN=false,NODE_ENV=production
```
A Cloud Run usa o `Dockerfile` (saída `standalone` do Next). `--allow-unauthenticated`
porque o login é feito no app; a proteção de rota está na sessão.

## 4. CORS do backend
No backend (`app/main.py`), troque `allow_origins=["*"]` pela URL do front:
```python
allow_origins=["https://athena-web-xxxxx.us-central1.run.app", "https://athena.grupoom.com.br"]
```

## 5. Camada extra de segurança (recomendado)
- **Cloud Armor** na frente da Cloud Run: WAF + rate limit por IP (barra flood/abuso).
- **Budget alerts**: Billing → Budgets & alerts → alarme por dia.
- **Domínio + HTTPS**: mapear `athena.grupoom.com.br` (Cloud Run domain mapping; TLS automático).

## 6. Login com Google (produção) — JÁ IMPLEMENTADO
O fluxo OAuth já está no app (sem NextAuth), reusando a sessão httpOnly assinada:
rotas `GET /api/auth/google/start` e `GET /api/auth/google/callback`.

Passos:
1. GCP → APIs e Serviços → Credenciais → **Criar OAuth client ID**, tipo **Aplicativo Web**.
2. **URIs de redirecionamento autorizados**: adicione
   `https://SEU-FRONT.us-central1.run.app/api/auth/google/callback`
   (e `http://localhost:3000/api/auth/google/callback` para dev).
3. Copie o Client ID e o Client Secret para os secrets e faça o deploy com:
```bash
echo -n "SEU_CLIENT_ID"     | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
echo -n "SEU_CLIENT_SECRET" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
# no deploy do front, some aos --set-secrets:
#   GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest
# e deixe ATHENA_DEV_LOGIN=false
```
O callback valida `ALLOWED_EMAIL_DOMAINS` (grupoom.com.br / opusmultipla.com.br) e
só então cria a sessão. O botão vermelho "Entrar com Google" já aponta para o fluxo;
o link "modo desenvolvimento" só funciona com `ATHENA_DEV_LOGIN=true`.

## Alternativa: Vercel
`vercel` na pasta `athena-web/`, e as mesmas variáveis em Project → Settings →
Environment Variables (todas **sem** `NEXT_PUBLIC_`). Funciona igual; a Cloud Run
é preferível por ficar junto do backend e do Secret Manager do GCP.
