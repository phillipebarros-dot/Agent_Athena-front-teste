# Athena Frontend

Frontend do assistente Athena da OpusMultipla. Aplicacao Next.js 14 (App Router) que funciona como interface de chat inteligente para consulta de dados de midia, planejamento e investimento. Conecta no backend FastAPI via proxy server-side com autenticacao Google OAuth 2.0.


## Arquitetura

O frontend e uma aplicacao Next.js que roda no Google Cloud Run. Toda comunicacao com o backend passa por um proxy server-side (`app/api/athena/[...path]/route.ts`) que injeta o token de autenticacao e controla o timeout. A autenticacao usa Google OAuth 2.0 com cookies de sessao assinados.

```
Navegador
    |
    v
Next.js (Cloud Run)
    |
    +-- /login              # Tela de login com Google
    +-- /chat               # Interface principal do chat
    +-- /admin              # Dashboard administrativo
    |
    +-- /api/auth/*          # OAuth 2.0 (Google)
    |     +-- /login         # Inicio do fluxo
    |     +-- /google/start  # Redireciona para Google
    |     +-- /google/callback # Recebe o token
    |     +-- /me            # Retorna sessao atual
    |     +-- /logout        # Encerra sessao
    |
    +-- /api/athena/[...path]  # Proxy para o backend FastAPI
          +-- Timeout: 120s
          +-- Injeta Bearer Token
          +-- Cookie de sessao
```


## Estrutura de arquivos

```
Agent_Athena-front-teste/
  app/
    globals.css              # Design system (tokens, cores, tipografia)
    layout.tsx               # Layout raiz (fontes, meta tags)
    page.tsx                 # Redirect para /chat
    icon.png                 # Favicon
    login/
      page.tsx               # Tela de login com botao Google
    chat/
      page.tsx               # Pagina principal do chat (toda a logica)
    admin/
      page.tsx               # Dashboard administrativo completo
    api/
      athena/
        [...path]/route.ts   # Proxy para backend FastAPI
      auth/
        login/route.ts       # POST login por email
        logout/route.ts      # POST logout
        me/route.ts          # GET sessao atual
        google/
          start/route.ts     # Inicia OAuth Google
          callback/route.ts  # Callback do Google
  components/
    Markdown.tsx             # Renderizador de markdown (react-markdown)
    AnimatedComposer.tsx     # Input com animacoes
    IconRail.tsx             # Barra lateral de icones
    chat/
      AnswerChart.tsx        # Graficos da resposta (barras, horizontal, pizza, linha)
      ChatHeader.tsx         # Cabecalho com titulo e rename
      ContextBar.tsx         # Barra de contexto flutuante e draggable
      FeedbackPanel.tsx      # Formulario de feedback (positivo/negativo)
      MessageBubble.tsx      # Bolha de mensagem (user + assistant)
      MessageList.tsx        # Lista de mensagens com scroll
      Sidebar.tsx            # Sidebar com conversas, busca, agrupamento
      SkeletonLoaders.tsx    # Loaders animados para carregamento
      WelcomeScreen.tsx      # Tela inicial com sugestoes
    scan-effect/
      DepthScanCard.tsx      # Efeito visual de scan
      scan.css               # CSS do efeito
  lib/
    api.ts                   # Cliente HTTP (browser, fala com /api/athena/*)
    config.ts                # Configuracao (BACKEND_URL, BACKEND_TOKEN)
    dc.tsx                   # Design components (B, IC, css helpers)
    format.ts                # Formatacao (relativeTime, initials, fmtNum)
    session.ts               # Gestao de sessao (cookies assinados)
    session-secret.ts        # Chave de assinatura do cookie
    shortcuts.ts             # Atalhos de teclado (Ctrl+K, Ctrl+N)
    theme.tsx                # Provider de tema (claro/escuro)
    types.ts                 # TypeScript types (ChatMessage, Conversation, etc)
  public/
    athena-logo.png          # Logo da Athena
    grupo-om.png             # Logo Grupo OM
    opus-branca.svg          # Logo Opus branca
    opus-multipla-logo.png   # Logo OpusMultipla
    partner-*.png            # Logos de parceiros
  Dockerfile                 # Container Node.js 20
  package.json               # Dependencias npm
  tsconfig.json              # Configuracao TypeScript
  next.config.mjs            # Configuracao Next.js
```


## Funcionalidades

### Chat

1. **Envio de mensagens**: Textarea com Enter para enviar, Shift+Enter para nova linha
2. **Gravacao por voz**: Botao de microfone usando Web Speech API (pt-BR), transcreve voz para texto
3. **Respostas em markdown**: Tabelas GFM, listas, negrito, code blocks
4. **Graficos automaticos**: Detecta tabelas na resposta e gera graficos SVG
   a. Barras verticais (default para dados categoricos)
   b. Barras horizontais (labels longos ou muitos itens)
   c. Pizza (percentuais que somam 100% ou poucos itens)
   d. Linha (dados temporais: meses, anos, datas)
5. **Paleta de 12 cores**: Graficos coloridos, nao monocromaticos
6. **Proveniencia**: Badge de fonte (BigQuery/Web/Modelo) + SQL executada + recorte geografico
7. **Exportacao**: CSV (client-side), XLSX (via backend), PDF (window.print com tabela formatada)
8. **Feedback**: Botao positivo/negativo com comentario opcional por resposta
9. **Ouvir (TTS)**: Botao que converte resposta em audio via OpenAI TTS
10. **Copiar**: Copia resposta para clipboard
11. **Regenerar**: Reenvia a mesma pergunta
12. **Parar geracao**: Botao "Parar" com AbortController per-conversa
13. **Contexto fixado**: Barra flutuante e draggable com chips editaveis (Ciclo, Plano, Periodo, Meio)
14. **Autocomplete**: Sugere entidades (veiculo, programa, praca) enquanto digita
15. **Compactacao**: Automatica apos 20 mensagens via Claude Haiku

### Sidebar

1. **Lista de conversas**: Agrupadas por Hoje, Ontem, Esta Semana, Anteriores
2. **Conversas fixadas**: Pin para manter no topo
3. **Busca**: Filtra conversas por titulo (Ctrl+K)
4. **Nova conversa**: Botao + atalho Ctrl+N
5. **Menu de contexto**: Renomear, Fixar, Duplicar, Excluir
6. **Seletor de cliente**: Dropdown multi-tenant (Boticario, Eudora, QDB, etc)
7. **Status de envio**: Indicador por conversa (evita confusao de "qual conversa ta gerando")
8. **Badge de notificacao**: "1 nova" quando resposta chega em outra conversa
9. **Busca por atalho**: Ctrl+K foca no campo de busca
10. **Tema claro/escuro**: Toggle com Moon/Sun
11. **Link Admin**: Visivel apenas para usuarios admin
12. **Logout**: Com confirmacao

### Admin Dashboard

1. **6 KPIs**: Mensagens totais, conversas ativas, usuarios unicos, assertividade, fb+, fb-
2. **Grafico de conversas por dia**: Barras verticais com 7 dias
3. **Atividade por hora**: 24 barras mostrando distribuicao horaria
4. **Distribuicao de mensagens**: Histograma por conversa
5. **Top usuarios**: Ranking com contagem de mensagens
6. **Feedback recente**: Lista com query, resposta, rating e comentario
7. **Drawer de conversa**: Clica numa conversa e ve todas as mensagens
8. **RBAC**: Gestao de usuarios com papeis (Administrador, Planejamento, Midia, Atendimento)
9. **Matriz de permissoes**: Visualizacao de quem pode fazer o que
10. **Status do sistema**: Checagem de Backend, OAuth, TTS, Export
11. **Saude MCP**: Status de cada conector (publi, pesquisas, export, digital)
12. **Dominios permitidos**: CRUD de dominios autorizados para login
13. **Sinonimos/Dicionario**: CRUD de mapeamentos de termos

### Autenticacao

1. **Google OAuth 2.0**: Login via conta Google
2. **Login por email**: Fallback para usuarios sem Google
3. **Cookie de sessao**: Assinado com HMAC, HttpOnly, Secure, SameSite=Lax
4. **Verificacao de dominio**: Apenas emails de dominios permitidos podem logar
5. **Sessao persistente**: Cookie dura 7 dias


## Design System

Cores da marca OpusMultipla (extraidas do site oficial):

| Token | Valor | Uso |
|-------|-------|-----|
| --red | #dd0004 | Cor principal, botoes, acentos |
| --bg-deep | #0d0c0c | Fundo da pagina |
| --bg-surface | #141312 | Fundo de paineis |
| --white | #f4f2f0 | Texto principal |
| --muted | #7a7472 | Texto secundario |
| --green | #3fb950 | Indicadores positivos |
| --gold | #d9a441 | Avisos |

Tipografia:
1. Body: Inter (Google Fonts)
2. Display: Oswald, Raleway
3. Mono: JetBrains Mono


## Proxy Backend

Todas as chamadas ao backend passam pelo proxy em `app/api/athena/[...path]/route.ts`:

1. O frontend chama `/api/athena/chat` (mesma origem)
2. O proxy redireciona para `BACKEND_URL/chat`
3. Injeta header `Authorization: Bearer BACKEND_TOKEN`
4. Timeout de 120 segundos
5. Cookie de sessao e validado no proxy

Variaveis de ambiente do proxy:

| Variavel | Descricao |
|----------|-----------|
| ATHENA_BACKEND_URL | URL do backend FastAPI |
| ATHENA_BACKEND_TOKEN | Token Bearer para autenticacao |
| GOOGLE_CLIENT_ID | Client ID do Google OAuth |
| GOOGLE_CLIENT_SECRET | Client Secret do Google OAuth |
| SESSION_SECRET | Chave HMAC para assinatura de cookies |


## Deploy

O frontend roda no Google Cloud Run. O deploy e feito via source deploy:

```bash
gcloud run deploy athena-frontend-teste \
  --source=. \
  --region=us-central1 \
  --allow-unauthenticated \
  --timeout=300
```


## Desenvolvimento local

```bash
# Instalar dependencias
npm install

# Configurar variaveis
cp .env.example .env.local
# Editar com as credenciais reais

# Rodar
npm run dev
```

O app abre em http://localhost:3000.


## Dependencias principais

| Pacote | Versao | Uso |
|--------|--------|-----|
| next | 14 | Framework React SSR |
| react | 18 | UI library |
| framer-motion | 11 | Animacoes e transicoes |
| react-markdown | 9 | Renderizacao de markdown |
| remark-gfm | 4 | Tabelas GFM no markdown |
| @phosphor-icons/react | 2 | Icones |


## Autores

Phillipe Barros, Camilo Ferreira, Wesley Macena, Andrei Nogueira
Grupo OpusMultipla
