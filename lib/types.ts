/**
 * Tipos compartilhados do Athena Web.
 * Cada useState deve referenciar uma interface daqui — zero `any`.
 */

/* ─── Auth / Sessão ─── */
export interface AuthUser {
  authenticated: boolean;
  email: string;
  name: string;
  admin?: boolean;
}

/* ─── Chat ─── */
export interface ChatMessage {
  message_id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system_summary';
  content: string;
  timestamp?: string;
  is_compacted?: boolean;
  /** Campos UI-only (não vêm do backend) */
  pending?: boolean;
  error?: boolean;
  attachment?: MessageAttachment | null;
  fb?: 'positive' | 'negative';
  sources?: MessageSource[];
  query?: string;
}

export interface MessageAttachment {
  status: string;
  file_type: string;
  url: string;
  view_url?: string;
}

export interface MessageSource {
  label: string;
  detail?: string;
}

/* ─── Conversas ─── */
export interface Conversation {
  conversation_id: string;
  user_id: string;
  title: string;
  status: string;
  message_count: number;
  created_at?: string;
  updated_at?: string;
}

/* ─── Admin / Auditoria ─── */
export interface KpiData {
  total_messages: number;
  active_conversations: number;
  unique_users: number;
  positive_count: number;
  negative_count: number;
}

export interface TopUser {
  user_id: string;
  message_count: number;
}

export interface AuditActivity {
  user_id: string;
  timestamp: string;
  action?: string;
}

export interface AuditFeedback {
  message_id: string;
  user_id: string;
  rating: 'positive' | 'negative';
  user_query?: string;
  assistant_response?: string;
  comment?: string;
  timestamp?: string;
}

export interface AuditConversation {
  conversation_id: string;
  user_id: string;
  title: string;
  status: string;
  message_count: number;
  created_at?: string;
  updated_at?: string;
}

/* ─── Gráficos derivados ─── */
export interface DayBucket {
  key: string;
  label: string;
  v: number;
  h: number;
}

export interface HourBucket {
  h: number;
  v: number;
  ht: number;
}

export interface MsgDistBucket {
  label: string;
  v: number;
  h: number;
}

/* ─── Tabela GFM parseada ─── */
export interface ParsedTable {
  headers: string[];
  rows: string[][];
  labelCol: number;
  valueCol: number;
}
