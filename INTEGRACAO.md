# Integração Front ↔ Backend, mapa de ligação

Tudo que o front chama passa pelo cliente `lib/api.ts` (navegador) → proxy
`/api/athena/*` (servidor, injeta o token) → backend Python.

## Endpoints do backend (contrato real, lido de `app/main.py` + `app/models.py`)

| Ação na UI | `lib/api.ts` | Backend | Corpo |
|---|---|---|---|
| Enviar mensagem | `api.chat({message, conversation_id, is_audio})` | `POST /chat` | retorna `{output, conversation_id, latency_ms, attachment, audio}` |
| Listar conversas (sidebar) | `api.listConversations()` | `POST /conversations {action:'list'}` | `{conversations[]}` |
| Nova conversa | `api.createConversation(id, title)` | `POST /conversations {action:'create'}` |, |
| Renomear conversa | `api.renameConversation(id, title)` | `POST /conversations {action:'updateTitle'}` |, |
| Carregar histórico | `api.history(conversation_id)` | `POST /history` | `{messages[]}` |
| Salvar mensagem | `api.saveMessage({conversation_id, role, content})` | `POST /save-message` |, |
| Feedback (útil/corrigir) | `api.feedback({message_id, rating, ...})` | `POST /feedback` | vira aprendizado na curadoria |
| Compactar memória | `api.compact(conversation_id)` | `POST /compact` |, |
| Ouvir resposta (voz) | `api.tts(text)` | `POST /tts` | `{audio}` (base64 mp3) |
| Exportar tabela | `api.export({data, title, format})` | `POST /export` | XLSX/Sheets/CSV |
| Admin, KPIs, atividade, feedback, usuários, sessões | `api.audit(query, extra)` | `POST /audit` | `query ∈ {kpis, recent_activity, recent_feedback, top_users, all_conversations, conversation_messages}` |
| Login / sessão | `auth.login()`, `auth.me()`, `auth.logout()` | rotas `/api/auth/*` | cookie httpOnly |

`user_id` e `user_email` são injetados pelo proxy a partir da sessão, **não**
mande do navegador.

## Estado da ligação
- ✅ **Login** (`/login`) já ligado: botão → `auth.login()` → sessão → `/chat`.
  (Em dev com `ATHENA_DEV_LOGIN=true` entra num clique; em prod, Google OAuth.)
- 🟡 **Chat e Admin** ainda renderizam com **dados mock** (funciona offline, sem backend).
  Para ativar o backend, troque os mocks pelas chamadas abaixo. O padrão é sempre
  "tenta a API; se `isBackendError`, mantém o mock".

## Como ligar o Chat (exemplo de drop-in)
No `app/chat/page.tsx`, no envio do compositor:
```ts
import { api, isBackendError } from '@/lib/api';

async function enviar(texto: string) {
  setGenerating(true);
  try {
    const r = await api.chat({ message: texto, conversation_id: convId });
    adicionarMensagemAthena(r.output, r.attachment, r.audio);
  } catch (e) {
    if (!isBackendError(e)) mostrarErro('Falha ao consultar o Publi.');
    // isBackendError → segue no modo simulação
  } finally {
    setGenerating(false);
  }
}
```
Feedback (o painel "Corrigir a Athena"):
```ts
await api.feedback({ message_id, rating: 'negative', conversation_id: convId,
  user_query, assistant_response, comment });
```
Ouvir (botão de áudio): `const { audio } = await api.tts(texto); tocar(audio);`

## Como ligar o Admin (exemplo de drop-in)
No `app/admin/page.tsx`, carregue os dados reais no mount e caia no mock se o
backend não responder:
```ts
useEffect(() => {
  (async () => {
    try {
      const kpis = await api.audit('kpis');
      const sessoes = await api.audit('all_conversations', { date_from, date_to });
      setLive({ kpis: kpis.data, sessoes: sessoes.data });
    } catch { /* mantém mock */ }
  })();
}, []);
```
Depois use `live?.kpis ?? compact` etc. no render. O drawer de uma sessão usa
`api.audit('conversation_messages', { conversation_id })`.

## Observação sobre streaming
O `/chat` do backend responde **JSON completo** (não SSE). O front faz `await
api.chat(...)` e mostra a resposta quando chega, com a faixa "Consultando o
Publi" enquanto espera. Se depois quiserem token-a-token, o backend expõe um
`/chat/stream` (SSE) e o front troca `api.chat` por um leitor de `EventSource` -
o resto (proxy, sessão) continua igual.
