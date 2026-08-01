# Athena Frontend - Interface de Inteligencia de Midia (v3.2.0)

**Autor**: Phillipe Barros ([@phillipebarros-dot](https://github.com/phillipebarros-dot))  
**Organizacao**: Opus Multipla / Grupo OM  
**Versao**: 3.2.0 | **Licenca**: Proprietaria

Frontend do assistente Athena. Interface de chat inteligente para consulta de dados de midia, planejamento e investimento publicitario. Aplicacao Next.js 14 com autenticacao Google OAuth 2.0, proxy server-side seguro e design system proprio. Inclui o assistente virtual Saori (Logo PNG + emoji) para guiar usuarios.

---

## Indice

- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Funcionalidades](#funcionalidades)
- [Saori - Assistente Virtual](#jack---assistente-virtual)
- [Componentes](#componentes)
- [Atalhos de Teclado](#atalhos-de-teclado)
- [Configuracao](#configuracao)
- [Deploy](#deploy)
- [Estrutura de Arquivos](#estrutura-de-arquivos)
- [Seguranca](#seguranca)
- [Guia do Usuario](#guia-do-usuario)

---

## Tecnologias

| Camada | Tecnologia | Versao | Proposito |
|--------|-----------|--------|-----------|
| Framework | Next.js | 14 (App Router) | SSR + API Routes |
| Linguagem | TypeScript | 5.x | Tipagem estatica |
| React | React | 18.x | UI reativa |
| Autenticacao | Google OAuth 2.0 | - | Login corporativo |
| Sessao | HMAC-SHA256 | - | Cookie httpOnly assinado |
| Estilos | CSS Variables | - | Design system proprio (sem Tailwind) |
| Fontes | Google Fonts | Inter + DM Sans | Tipografia premium |
| Markdown | Renderizacao propria | - | Parser GFM com tabelas |
| Graficos | SVG custom | inline | Visualizacao premium (bar, horizontal, pie, line) |
| Logo PNG + emoji | pixi-Logo PNG + emoji-display | + PixiJS v7 | Assistente Saori (VTuber, sem audio/emoji) |
| Lip Sync | Web Audio API | AnalyserNode | Sincronizacao boca/audio |
| Voz TTS | Gemini 2.5 Flash TTS | voz Charon | Ultra-realista, masculina grave, emocoes naturais |
| TTS Fallback | Google Cloud Neural2 + OpenAI | pt-BR-Neural2-B / onyx | Fallback em cadeia 3 provedores |
| Voz STT | Web Speech API | - | Ditado por voz (Chrome) |
| CSP | Nonce per-request | middleware.ts | Content Security Policy |
| Infra | Google Cloud Run | - | Serverless containers |
| CI/CD | Docker | - | Containerizacao standalone |

---

## Arquitetura

```
Navegador (Chrome/Edge)
    |
    v
Next.js 14 (Cloud Run)
    |
    +-- /login               Tela de login com Google
    +-- /chat                Interface principal do chat
    +-- /faq                 Central de Ajuda (FAQ completo)
    +-- /admin               Dashboard administrativo
    |
    +-- /api/auth/*           Fluxo OAuth 2.0
    |     +-- /google/start   Redireciona para Google (scopes: email, sheets, drive)
    |     +-- /google/callback Recebe o token, valida dominio
    |     +-- /me             Retorna sessao atual (JWT)
    |     +-- /logout         Encerra sessao
    |
    +-- /api/athena/[...path]  Proxy seguro para o backend FastAPI
    |     +-- Timeout: 120s
    |     +-- Injeta Bearer Token (server-side, nunca exposto)
    |     +-- Injeta user_email e google_access_token
    |
    +-- middleware.ts         CSP com nonce por request
```

---

## Funcionalidades

### Chat Inteligente
- Envio de mensagens: Texto livre com contexto de cliente e ciclo
- Respostas em Markdown: Tabelas GFM, listas, negrito, codigo
- Tabelas interativas: Renderizacao rica com headers estilizados
- Graficos automaticos: Botao "Ver em grafico" com deteccao inteligente (barras, horizontal, pizza, linha)
- Label inteligente: Detecta e ignora colunas de indice numerico, exibe nome real
- Design premium: Gradiente harmonioso, hover effects, valores fora de barras pequenas
- Chips de sugestao: 8 prompts predefinidos na tela inicial
- Regenerar resposta: Botao para refazer a ultima consulta
- Feedback: Like/dislike com comentario por mensagem

### Gestao de Conversas (Sidebar)
- Nova conversa: Botao ou Ctrl+N
- Renomear: Clique no icone de lapis (hover)
- Fixar: Pin para manter no topo
- Duplicar: Cria copia de uma conversa
- Deletar: Remove conversa do historico
- Busca: Filtra conversas por titulo
- Indicador "Pensando...": Badge animado quando o agente processa
- Badge de notificacao: Aviso quando resposta chega em conversa inativa
- Parar geracao: Botao "Parar" ou Ctrl+Shift+S

### Exportacao de Dados
- CSV: Download direto no navegador
- XLSX: Via backend com headers estilizados e auto-width
- PDF: Gera HTML formatado e abre impressao
- Google Sheets: Cria planilha nativa no Drive do usuario (botao verde)

### Voz (Gemini TTS Ultra-Realista)
- TTS automatico: Respostas lidas em voz alta com Gemini 2.5 Flash TTS (voz Charon, masculina grave)
- Toggle TTS: Botao de volume no compositor para ativar/desativar voz
- Parar audio: Botao pulsante para interromper reproducao
- Fallback 3 niveis: Gemini TTS â†’ Google Cloud Neural2 â†’ OpenAI TTS
- Ditado: Botao de microfone no compositor (Web Speech API, Chrome)

### Upload de Documentos
- PDF: Extrai texto e usa como contexto da pergunta
- Excel/CSV: Extrai dados e inclui na conversa

### Contexto Fixado
- Barra de contexto: Chips editaveis (Ciclo, Plano, Periodo, Meio)
- Cliente: Seletor no sidebar (Boticario, Eudora, etc.)
- Persistente: Contexto acompanha todas as mensagens da conversa

### Admin Dashboard (Lazy Load Otimizado)
- Auditoria: Log de todas as consultas com query SQL, tokens, timestamp
- KPIs: Mensagens, conversas ativas, usuarios, assertividade, feedback +/-
- Dominios: Gerenciar dominios de e-mail permitidos para login
- Sinonimos: Mapear termos de busca para nomes do Publi
- Usuarios e Permissoes: Roles (Admin, Planejamento, Midia, Atendimento)
- System Stats: CPU, memoria, MCP health
- Lazy Load: Carrega dados por aba sob demanda (3 requests iniciais em vez de 8)
- Graficos de atividade: Spark bars por dia, distribuicao por hora

---

## Saori - Assistente Virtual

O Saori e um personagem Logo PNG + emoji integrado ao frontend que funciona como assistente de onboarding e ajuda contextual. Ele guia os usuarios pelas funcionalidades do sistema, explica botoes, ajuda a tomar decisoes e responde duvidas sobre o uso da Athena.

### Caracteristicas
- Modelo Logo PNG + emoji Cubism renderizado via PixiJS no navegador
- 7 expressoes emocionais: feliz, bravo, preocupado, envergonhado, fofo, surpreso, confuso
- Lip sync em tempo real: Web Audio API analisa volume do audio TTS e sincroniza com a boca
- Respostas texto-only: Sem audio TTS no Saori (economia de quota)
- Sem emojis: Prompt proibe emojis para respostas profissionais
- Baloes de fala: Efeito typewriter com animacao de entrada/saida
- Deteccao de emocao: Analisa o contexto da resposta e muda expressao automaticamente
- Animacoes idle: Respiracao, piscar, fisica de gravata e cadarco
- Redireciona para /faq: Orienta usuarios a Central de Ajuda completa

### Quando o Saori aparece
- Primeira vez que o usuario acessa o sistema
- Quando o usuario precisa de ajuda com funcionalidades

### Parametros do modelo
- ParamMouthOpenY: Abertura da boca (lip sync, 0.0 a 1.0)
- ParamMouthForm: Formato da boca (sorriso vs neutro)
- ParamAngleX/Y/Z: Rotacao da cabeca
- ParamBodyAngleX/Y/Z: Inclinacao do corpo
- ParamBreath: Respiracao (idle)
- ParamEyeLOpen/ROpen: Piscar
- ParamEyeBallX/Y: Direcao do olhar

---

## Componentes

| Componente | Arquivo | Descricao |
|-----------|---------|-----------|
| Sidebar | components/chat/Sidebar.tsx | Lista de conversas, busca, acoes |
| NavRail | components/chat/NavRail.tsx | Sidebar slim com icones (UntitledUI style) |
| MessageBubble | components/chat/MessageBubble.tsx | Bolha de mensagem (user/assistant) |
| MessageList | components/chat/MessageList.tsx | Lista scrollavel de mensagens |
| ContextBar | components/chat/ContextBar.tsx | Barra de contexto fixado |
| AnimatedComposer | components/AnimatedComposer.tsx | Composer da WelcomeScreen com sugestoes grid 2col |
| WelcomeScreen | components/chat/WelcomeScreen.tsx | Tela inicial com chips de sugestao |
| AnswerChart | components/chat/AnswerChart.tsx | Graficos SVG premium (bar/horizontal/pie/line) |
| SaoriFloating | components/SaoriFloating.tsx | Assistente Logo PNG + emoji flutuante |
| Logo PNG + emojiCanvas | components/jack/Logo PNG + emojiCanvas.tsx | Renderizador Logo PNG + emoji (PixiJS) |
| IC | lib/dc.tsx | Icone SVG inline + design components |

---

## Atalhos de Teclado

| Atalho | Acao |
|--------|------|
| Ctrl+N | Nova conversa |
| Ctrl+B | Abrir/fechar sidebar |
| Ctrl+K | Focar na busca |
| Ctrl+Shift+S | Parar geracao |
| Enter | Enviar mensagem |
| Shift+Enter | Nova linha |

---

## Configuracao

### Variaveis de Ambiente

```env
# Obrigatorias
ATHENA_BACKEND_URL=https://athena-backend-xxx.run.app
ATHENA_BACKEND_TOKEN=token-de-acesso-ao-backend
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
SESSION_SECRET=chave-aleatoria-32-chars

# Controle de Acesso
ALLOWED_EMAIL_DOMAINS=grupoom.com.br,opusmultipla.com.br
ADMIN_EMAILS=phillipe.barros@grupoom.com.br

# Opcionais
RATE_LIMIT_PER_MINUTE=30
ATHENA_DEV_LOGIN=false
NODE_ENV=production
```

---

## Deploy

```bash
# Build e deploy no Cloud Run
gcloud run deploy athena-frontend \
  --source=. \
  --region=us-central1 \
  --allow-unauthenticated \
  --timeout=300 \
  --set-secrets="ATHENA_BACKEND_TOKEN=ATHENA_BACKEND_TOKEN:latest"
```

---

## Estrutura de Arquivos

```
Agent_Athena-front-teste/
  app/
    globals.css               # Design system (240+ tokens CSS)
    layout.tsx                # Layout raiz (fontes, meta SEO)
    page.tsx                  # Redirect para /chat
    login/page.tsx            # Tela de login Google OAuth
    chat/page.tsx             # Pagina principal (toda a logica)
    faq/page.tsx              # Central de Ajuda (FAQ completo, dark theme, 9 categorias)
    admin/page.tsx            # Dashboard administrativo
    api/
      auth/                   # OAuth 2.0 (start, callback, me, logout)
      athena/[...path]/       # Proxy seguro para backend
  components/
    chat/                     # Sidebar, MessageBubble, Composer, etc.
    jack/                     # Logo PNG + emojiCanvas, SpeechBubble
    ui/                       # IC (icone SVG inline)
  lib/
    api.ts                    # Cliente HTTP (call, endpoints)
    config.ts                 # Configuracoes server-side
    session.ts                # JWT sign/verify (HMAC-SHA256)
    session-secret.ts         # Geracao/validacao do secret
    lipsync.ts                # Motor de lip sync (Web Audio API)
    jack-emotions.ts          # Mapeamento texto para expressao
    types.ts                  # Tipos compartilhados
    useTheme.ts               # Hook de tema (light/dark)
  middleware.ts               # CSP com nonce por request
  public/
    jack/                     # Modelo Logo PNG + emoji (moc3, texturas, expressoes)
  next.config.mjs             # Config Next.js + security headers
  Dockerfile                  # Container standalone para Cloud Run
  package.json                # Dependencias
  README.md                   # Este arquivo
```

---

## Seguranca

- OAuth 2.0: Login exclusivo via Google, restrito a dominios permitidos
- Sessao: Cookie httpOnly + Secure + SameSite=Lax (HMAC-SHA256)
- CSP: Content-Security-Policy com nonce por request (sem unsafe-inline em scripts)
- HSTS: Strict-Transport-Security com preload
- Proxy: Token do backend nunca exposto no navegador (server-side only)
- Rate Limit: 30 req/min por IP+endpoint no proxy
- State CSRF: Token aleatorio no fluxo OAuth (cookie + URL param)
- X-Frame-Options: DENY (impede iframe)
- Referrer-Policy: strict-origin-when-cross-origin

---

## Guia do Usuario

### Como fazer perguntas eficientes

1. Seja especifico: "Investimento do Boticario em TV no ciclo 04" e melhor que "gastos com TV"
2. Informe o periodo: Ciclo (C01-C06), meses ou datas especificas
3. Use nomes como estao no Publi: Se nao souber, pergunte a Athena qual o nome correto
4. Uma pergunta por vez: Separe consultas complexas em conversas diferentes

### FAQ

P: A Athena nao encontrou meus dados. O que fazer?
R: Tente variacoes do nome (ex: "Meio Dia PR" em vez de "Meio Dia Parana"). Use termos parciais.

P: Posso exportar os resultados?
R: Sim. Clique em CSV, XLSX, PDF ou Sheets (verde) abaixo de qualquer tabela.

P: Como ouvir a resposta em audio?
R: Clique no icone de alto-falante ao lado da resposta. Funciona melhor em Chrome.

P: A resposta apareceu na conversa errada?
R: Evite trocar de conversa enquanto a Athena esta respondendo. Se acontecer, volte a conversa original.

P: Como falar por voz?
R: Clique no icone de microfone no compositor. Disponivel apenas em Chrome.

P: Posso renomear conversas?
R: Sim. Passe o mouse sobre a conversa na sidebar e clique no icone de lapis.

P: O que e o Saori?
R: O Saori e o assistente virtual Logo PNG + emoji que guia voce pelas funcionalidades do sistema. Ele aparece no canto inferior direito do chat e pode direcionar para a Central de Ajuda (/faq).

P: Onde fica a Central de Ajuda?
R: Acesse /faq no navegador ou clique em "Ver Central de Ajuda completa" no Saori. La tem 9 categorias com todas as funcionalidades documentadas.

