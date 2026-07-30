'use client';
import React, { useState } from 'react';
import { B, IC, css } from '@/lib/dc';
import { Markdown } from '@/components/Markdown';
import { FeedbackActions, FeedbackForm } from './FeedbackPanel';
import { AnswerChart, parseTable } from './AnswerChart';
import type { ChatMessage } from '@/lib/types';
import { initials } from '@/lib/format';

interface MessageBubbleProps {
  message: ChatMessage;
  me: { name?: string; email?: string } | null;
  onSendFeedback: (m: ChatMessage, rating: 'positive' | 'negative', comment?: string) => void;
  chartOpen: boolean;
  onToggleChart: () => void;
}

/** Bubble de mensagem do usuário. */
function UserBubble({ message, me }: { message: ChatMessage; me: MessageBubbleProps['me'] }) {
  return (
    <div style={css('display:flex; flex-direction:row-reverse; gap:14px; align-items:flex-start')}>
      <div style={css('width:34px; height:34px; border-radius:50%; flex-shrink:0; margin-top:2px; background:linear-gradient(135deg,var(--red-dim),var(--red)); display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-size:12px; font-weight:700')}>{initials(me?.name || me?.email)}</div>
      <div style={css('flex:1; min-width:0; display:flex; flex-direction:column; align-items:flex-end')}>
        <div style={css('font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--muted); margin-bottom:6px')}>Você</div>
        <div style={css('display:inline-block; max-width:100%; background:var(--user-bubble); border:1px solid var(--border-subtle); border-radius:12px 4px 12px 12px; padding:12px 15px; font-size:14.5px; line-height:1.7; white-space:pre-wrap')}>{message.content}</div>
      </div>
    </div>
  );
}

/** Bubble de resposta da Athena. */
function AssistantBubble({ message, onSendFeedback, chartOpen, onToggleChart }: Omit<MessageBubbleProps, 'me'>) {
  const [fbOpen, setFbOpen] = useState(false);
  const table = !message.error ? parseTable(message.content) : null;

  return (
    <div style={css('display:flex; gap:14px; align-items:flex-start')}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/athena-logo.png" alt="Athena" style={css('width:38px; height:38px; object-fit:contain; flex-shrink:0; margin-top:1px')} />
      <div style={css('flex:1; min-width:0')}>
        <div style={css('font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--red); opacity:.85; margin-bottom:6px')}>Athena</div>
        <div style={css(`display:block; max-width:100%; background:var(--bg-card); border:1px solid ${message.error ? 'var(--red-dim)' : 'var(--border)'}; border-radius:4px 12px 12px 12px; padding:13px 16px`)}>
          {message.error ? <span style={css('font-size:14px; color:var(--muted-light)')}>{message.content}</span> : <Markdown>{message.content}</Markdown>}

          {/* Attachment */}
          {message.attachment?.url && (
            <a href={message.attachment.view_url || message.attachment.url} target="_blank" rel="noopener noreferrer" style={css('display:inline-flex; align-items:center; gap:8px; margin-top:6px; padding:8px 12px; border:1px solid var(--border); border-radius:8px; font-size:12px; color:var(--white); text-decoration:none')}>
              <IC s={14} d='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' stroke="var(--green)" />
              Abrir {message.attachment.file_type === 'sheet' ? 'planilha' : 'PDF'}
            </a>
          )}

          {/* Sources / Query */}
          {!message.error && (message.query || (message.sources && message.sources.length > 0)) && (
            <details style={css('margin-top:10px; border-top:1px solid var(--border-faint); padding-top:10px')}>
              <summary style={css('cursor:pointer; font-size:11px; letter-spacing:1.4px; text-transform:uppercase; color:var(--muted-light); font-weight:600')}>Como cheguei nesse resultado</summary>
              {message.sources && message.sources.length > 0 && (
                <div style={css('display:flex; flex-wrap:wrap; gap:6px; margin-top:10px')}>
                  {message.sources.map((s, si) => (
                    <span key={si} style={css('display:inline-flex; align-items:center; gap:6px; padding:4px 9px; border-radius:20px; border:1px solid var(--border); background:var(--bg-panel); font-size:11px; color:var(--muted-light)')}><span style={css('width:5px; height:5px; border-radius:50%; background:var(--green-dim)')} />{s.label}{s.detail ? ` · ${s.detail}` : ''}</span>
                  ))}
                </div>
              )}
              {message.query && (
                <pre style={css("margin:10px 0 0; padding:12px; background:var(--bg-code); border:1px solid var(--border); border-radius:10px; overflow-x:auto; font-family:var(--font-mono); font-size:11.5px; line-height:1.7; color:var(--muted-light); white-space:pre-wrap; word-break:break-word")}>{message.query}</pre>
              )}
            </details>
          )}

          {/* Aviso de truncamento — detecta respostas possivelmente incompletas */}
          {!message.error && table && table.rows.length >= 2 && table.rows.length <= 5 && (
            <div style={css('display:flex; align-items:center; gap:8px; margin-top:10px; padding:8px 12px; background:rgba(201,162,39,.08); border:1px solid rgba(201,162,39,.18); border-radius:8px; font-size:11.5px; color:var(--gold)')}>
              <IC s={14} d='<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' stroke="var(--gold)" />
              <span>Resultados podem estar incompletos. Tente refinar sua pergunta para um período ou veículo específico.</span>
            </div>
          )}
        </div>

        {/* Chart */}
        {table && <AnswerChart table={table} on={chartOpen} onToggle={onToggleChart} />}

        {/* Actions */}
        {!message.error && (
          <FeedbackActions message={message} onSendFeedback={onSendFeedback} fbOpen={fbOpen} onToggleFb={() => setFbOpen(!fbOpen)} />
        )}

        {/* Feedback form */}
        {fbOpen && (
          <FeedbackForm message={message} onSendFeedback={(m, r, c) => { onSendFeedback(m, r, c); setFbOpen(false); }} onClose={() => setFbOpen(false)} />
        )}
      </div>
    </div>
  );
}

export function MessageBubble(props: MessageBubbleProps) {
  if (props.message.role === 'user') {
    return <UserBubble message={props.message} me={props.me} />;
  }
  return <AssistantBubble {...props} />;
}
