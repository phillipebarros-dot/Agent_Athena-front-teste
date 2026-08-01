# 📚 Documentação Técnica — Frontend Streaming SSE

> Baseado na documentação oficial de: Next.js App Router, Anthropic, Open-WebUI patterns.
> Última atualização: 2026-08-01

---

## Fontes Oficiais

| Tecnologia | Documentação |
|-----------|-------------|
| Next.js Route Handlers | nextjs.org/docs/app/building-your-application/routing/route-handlers |
| Web Streams API | developer.mozilla.org/en-US/docs/Web/API/ReadableStream |
| SSE Specification | html.spec.whatwg.org/multipage/server-sent-events.html |
| AbortController | developer.mozilla.org/en-US/docs/Web/API/AbortController |

---

## Arquitetura de Streaming

```
Browser (React)
  ↓ POST /api/athena/chat/stream
  ↓ AbortSignal attached
Next.js Route Handler
  ↓ Proxy fetch to backend
  ↓ Pipes res.body (ReadableStream)
FastAPI Backend
  ↓ agent.astream_events(version="v2")
  ↓ Yields SSE events
Claude API (Anthropic)
```

### Protocolo SSE

Cada evento segue o formato:
```
data: {"t":"tok","c":"token_text"}\n\n
```

Tipos:
- `tok` — Token de texto do LLM
- `tool` — Tool call (start/end)
- `done` — Geração completa
- `err` — Erro

---

## Proxy SSE Route Handler

Arquivo: `app/api/athena/chat/stream/route.ts`

- Usa `export const dynamic = 'force-dynamic'` (não cachear)
- Faz fetch para o backend FastAPI
- Retorna `res.body` (ReadableStream) direto — zero buffering
- Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`
- NÃO propaga `req.signal` ao backend (geração continua se client sair)

---

## Consumer SSE (api.ts)

Função `chatStream()` em `lib/api.ts`:

1. Faz `fetch` com `signal` (AbortSignal) do componente
2. Lê `res.body` via `getReader()` + `TextDecoder`
3. Parseia linhas SSE (`data: {...}`)
4. Chama callbacks: `onToken`, `onToolStart`, `onToolEnd`, `onDone`, `onError`

### Buffer handling

SSE chunks podem chegar incompletos. O consumer mantém um buffer:
```
buffer += decoder.decode(value, { stream: true })
lines = buffer.split('\n')
buffer = lines.pop()  // último pedaço pode estar incompleto
```

---

## Abort Handling

### User clica "Parar"
- Frontend chama `abortController.abort()`
- Fetch é cancelado (AbortError)
- Texto parcial já renderizado permanece visível
- Mensagem parcial é salva no histórico

### User sai da página / troca de conversa
- React cleanup (useEffect return) chama `abort()`
- Mesma lógica de "Parar"
- Quando user volta, carrega histórico do backend (BigQuery + Postgres)

### Backend behavior
- O proxy NÃO propaga abort ao backend
- Backend pode continuar processando (salva no Postgres)
- Se o backend detectar desconexão (http.disconnect), para por economia

---

## Persistência de Contexto

### Como funciona (baseado em análise dos repos oficiais)

1. **Postgres Checkpointer** (LangGraph) — Persiste estado do agente
   - `thread_id` = `conversation_id`
   - Salva automaticamente a cada step do grafo
   - Sobrevive restarts do container

2. **BigQuery** — Persiste mensagens do chat
   - Tabela `athena_messages` — histórico completo
   - Tabela `athena_conversations` — metadados

3. **Frontend** — Renderiza do estado local + busca do backend
   - `useEffect` carrega histórico ao montar
   - Estado local atualizado em real-time via SSE
   - Se sair e voltar: re-fetch do histórico

### Fluxo de reconexão

```
1. User sai da página
2. AbortController.abort() → stream cancela
3. Texto parcial pode ser salvo via api.saveMessage()
4. User volta à mesma conversa
5. Frontend faz api.history(conversation_id)
6. Backend retorna histórico do BigQuery
7. Contexto do agente está no Postgres (checkpointer)
8. Próxima pergunta retoma o contexto completo
```
