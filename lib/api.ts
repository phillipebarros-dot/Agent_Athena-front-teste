'use client';
/**
 * Cliente do navegador. Fala SÓ com a mesma origem (/api/*), nunca com o
 * backend direto, nunca com um token. O cookie de sessão vai junto automaticamente.
 *
 * Todo componente client importa daqui:
 *    import { api } from '@/lib/api'
 *    const r = await api.chat({ message, conversation_id })
 */

import type { Conversation as ConversationType, MessageAttachment, MessageSource, AthenaUser } from '@/lib/types';

export type ChatReply = {
  output: string;
  conversation_id: string;
  latency_ms?: number;
  attachment?: MessageAttachment | null;
  audio?: string | null;
  sources?: MessageSource[] | null;
  query?: string | null;
  tables?: string[] | null;
};
/** @deprecated Use Conversation from '@/lib/types' */
export type Conversation = ConversationType;
export type Msg = { message_id: string; conversation_id: string; user_id: string; role: string; content: string; timestamp?: string; is_compacted?: boolean };

async function call<T>(endpoint: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api/athena/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body ?? {}),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 401 = sessao expirada/invalida → redirecionar para login (evita loop infinito)
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
      // Lanca erro silencioso pra parar a cadeia de execucao
      throw Object.assign(new Error('sessao_expirada'), { status: 401, data, _redirecting: true });
    }
    throw Object.assign(new Error(data?.error || `erro_${res.status}`), { status: res.status, data });
  }
  return data as T;
}

export const api = {
  // chat principal (equivale ao POST /chat do backend)
  chat: (p: { message: string; conversation_id?: string; is_audio?: boolean; client?: string }, signal?: AbortSignal) => call<ChatReply>('chat', p, signal),
  // conversas
  listConversations: () => call<{ conversations: Conversation[] }>('conversations', { action: 'list' }),
  createConversation: (conversation_id: string, title?: string) => call('conversations', { action: 'create', conversation_id, title }),
  renameConversation: (conversation_id: string, title: string) => call('conversations', { action: 'updateTitle', conversation_id, title }),
  deleteConversation: (conversation_id: string) => call('conversations', { action: 'delete', conversation_id }),
  // histórico
  history: (conversation_id: string, limit = 200) => call<{ messages: Msg[] }>('history', { conversation_id, limit }),
  saveMessage: (p: { conversation_id: string; role: string; content: string }) => call('save-message', p),
  compact: (conversation_id: string) => call('compact', { conversation_id }),
  // feedback (vira aprendizado na curadoria)
  feedback: (p: { message_id: string; rating: 'positive' | 'negative'; conversation_id?: string; user_query?: string; assistant_response?: string; comment?: string }) => call('feedback', p),
  // auditoria (admin)
  audit: (query: 'kpis' | 'recent_activity' | 'recent_feedback' | 'top_users' | 'all_conversations' | 'conversation_messages' | 'system_stats' | 'mcp_health', extra?: { conversation_id?: string; date_from?: string; date_to?: string }) =>
    call<{ query: string; data: any }>('audit', { query, ...(extra || {}) }),
  // voz
  tts: (text: string) => call<{ audio: string }>('tts', { text }),
  // export
  export: (p: { data: any[]; title?: string; format?: 'sheets' | 'csv' | 'xlsx'; user_email?: string }) => call('export', p),
  // clientes (lista dinâmica dos anunciantes)
  listClients: () => call<{ clients: string[] }>('list-clients', {}).catch((): { clients: string[] } => ({ clients: [] })),
  // A4: autocomplete de entidades (veículo, programa, praça)
  searchEntities: (query: string, entity_type = 'all') => call<{ results: { name: string; type: string; label: string }[] }>('search-entities', { query, entity_type }),
  // users / RBAC (gestão de permissões)
  listUsers: () => call<{ users: AthenaUser[] }>('users', { action: 'list' }),
  checkUser: (email: string) => call<{ exists: boolean; role: string; nome: string }>('users', { action: 'check', email }),
  updateRole: (target_email: string, role: string) => call('users', { action: 'update_role', target_email, role }),
  // domínios permitidos (admin)
  getDomains: () => fetch('/api/athena/settings/domains').then(r => r.json()).catch(() => ({ domains: [] })) as Promise<{ domains: string[] }>,
  addDomain: (domain: string) => call('settings/domains/add', { domain }),
  removeDomain: (domain: string) => call('settings/domains/remove', { domain }),
  // sinônimos (dicionário admin)
  getSynonyms: () => fetch('/api/athena/settings/synonyms').then(r => r.json()).catch(() => ({ synonyms: [] })) as Promise<{ synonyms: { from: string; to: string }[] }>,
  addSynonym: (term_from: string, term_to: string) => call('settings/synonyms/add', { term_from, term_to }),
  removeSynonym: (term_from: string) => call('settings/synonyms/remove', { term_from }),
  // upload de documentos (PDF/Excel/CSV)
  upload: async (file: File): Promise<{ filename: string; type: string; text: string; tables?: any[]; tables_count?: number; pages?: number; sheets_count?: number }> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/athena/upload', { method: 'POST', credentials: 'include', body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data?.detail || `erro_${res.status}`), { status: res.status, data });
    return data;
  },
};

// sessão
export const auth = {
  me: () => fetch('/api/auth/me', { credentials: 'include' }).then((r) => r.json()),
  login: (email?: string) => fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(email ? { email } : {}) }).then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) })),
  logout: () => fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }),
};

/** true quando o backend ainda não está configurado, o app cai no modo mock. */
export function isBackendError(e: any) {
  return e?.status === 503 || e?.data?.error === 'backend_unconfigured';
}
