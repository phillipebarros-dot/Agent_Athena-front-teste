'use client';
/**
 * Cliente do navegador. Fala SÓ com a mesma origem (/api/*), nunca com o
 * backend direto, nunca com um token. O cookie de sessão vai junto automaticamente.
 *
 * Todo componente client importa daqui:
 *    import { api } from '@/lib/api'
 *    const r = await api.chat({ message, conversation_id })
 */

import type { Conversation as ConversationType, MessageAttachment, MessageSource } from '@/lib/types';

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

async function call<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/athena/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data?.error || `erro_${res.status}`), { status: res.status, data });
  return data as T;
}

export const api = {
  // chat principal (equivale ao POST /chat do backend)
  chat: (p: { message: string; conversation_id?: string; is_audio?: boolean; client?: string }) => call<ChatReply>('chat', p),
  // conversas
  listConversations: () => call<{ conversations: Conversation[] }>('conversations', { action: 'list' }),
  createConversation: (conversation_id: string, title?: string) => call('conversations', { action: 'create', conversation_id, title }),
  renameConversation: (conversation_id: string, title: string) => call('conversations', { action: 'updateTitle', conversation_id, title }),
  // histórico
  history: (conversation_id: string, limit = 200) => call<{ messages: Msg[] }>('history', { conversation_id, limit }),
  saveMessage: (p: { conversation_id: string; role: string; content: string }) => call('save-message', p),
  compact: (conversation_id: string) => call('compact', { conversation_id }),
  // feedback (vira aprendizado na curadoria)
  feedback: (p: { message_id: string; rating: 'positive' | 'negative'; conversation_id?: string; user_query?: string; assistant_response?: string; comment?: string }) => call('feedback', p),
  // auditoria (admin)
  audit: (query: 'kpis' | 'recent_activity' | 'recent_feedback' | 'top_users' | 'all_conversations' | 'conversation_messages', extra?: { conversation_id?: string; date_from?: string; date_to?: string }) =>
    call<{ query: string; data: any }>('audit', { query, ...(extra || {}) }),
  // voz
  tts: (text: string) => call<{ audio: string }>('tts', { text }),
  // export
  export: (p: { data: any[]; title?: string; format?: 'sheets' | 'csv' }) => call('export', p),
};

// sessão
export const auth = {
  me: () => fetch('/api/auth/me', { credentials: 'same-origin' }).then((r) => r.json()),
  login: (email?: string) => fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(email ? { email } : {}) }).then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) })),
  logout: () => fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }),
};

/** true quando o backend ainda não está configurado, o app cai no modo mock. */
export function isBackendError(e: any) {
  return e?.status === 503 || e?.data?.error === 'backend_unconfigured';
}
