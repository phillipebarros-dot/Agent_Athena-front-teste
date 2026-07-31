'use client';
import React, { useState } from 'react';
import { B, IC, css } from '@/lib/dc';
import { Markdown } from '@/components/Markdown';
import { FeedbackActions, FeedbackForm } from './FeedbackPanel';
import { AnswerChart, parseTable } from './AnswerChart';
import type { ChatMessage } from '@/lib/types';
import { initials } from '@/lib/format';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageBubbleProps {
  message: ChatMessage;
  me: { name?: string; email?: string; picture?: string } | null;
  onSendFeedback: (m: ChatMessage, rating: 'positive' | 'negative', comment?: string) => void;
  onRegenerate?: () => void;
  chartOpen: boolean;
  onToggleChart: () => void;
}

/** Bubble de mensagem do usuário. */
function UserBubble({ message, me }: { message: ChatMessage; me: MessageBubbleProps['me'] }) {
  return (
    <div style={css('display:flex; flex-direction:row-reverse; gap:14px; align-items:flex-start; margin-left: 20%;')}>
      {/* Avatar do usuário — foto do Google ou iniciais */}
      <div style={css('width:40px; height:40px; border-radius:50%; background:var(--bg-surface); border:1px solid var(--glass-border); display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px; overflow:hidden; box-shadow:var(--shadow-sm)')}>      
        {me?.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.picture} alt={me.name || 'Eu'} referrerPolicy="no-referrer" style={css('width:100%; height:100%; object-fit:cover;')} />
        ) : (
          <span style={css('font-size:13px; font-weight:700; color:var(--muted-light); letter-spacing:0.5px')}>{initials(me?.name || me?.email || '?')}</span>
        )}
      </div>
      <div style={css('flex:1; min-width:0; display:flex; flex-direction:column; align-items:flex-end')}>
        <div style={css('display:inline-block; max-width:100%; background:var(--user-bubble); border:1px solid var(--glass-border); border-radius:24px 6px 24px 24px; padding:13px 20px; font-size:15px; line-height:1.65; white-space:pre-wrap; color:var(--white); box-shadow:var(--shadow-sm);')}>
          {message.content}
        </div>
      </div>
    </div>
  );
}

/** Bubble de resposta da Athena. */
function AssistantBubble({ message, onSendFeedback, onRegenerate, chartOpen, onToggleChart }: Omit<MessageBubbleProps, 'me'>) {
  const [fbOpen, setFbOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const table = !message.error ? parseTable(message.content) : null;

  return (
    <div 
      style={css('display:flex; gap:14px; align-items:flex-start')} 
      onMouseEnter={() => setHovered(true)} 
      onMouseLeave={() => setHovered(false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div style={css('width:40px; height:40px; border-radius:50%; background:var(--bg-surface); border:1px solid var(--glass-border); display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px; box-shadow:var(--shadow-sm), 0 0 12px rgba(221,0,4,0.06)')}>      
        <img src="/athena-logo.png" alt="Athena" style={css('width:26px; height:26px; object-fit:contain;')} />
      </div>
      
      <div style={css('flex:1; min-width:0; max-width: 100%; position:relative')}>
        <div style={css(`display:block; max-width:100%; padding:0 0 8px 0;`)}>
          {message.error ? (
            <div style={css('background:var(--bg-card); border:1px solid var(--red-dim); border-radius:12px; padding:13px 16px;')}>
              <span style={css('font-size:14.5px; color:var(--muted-light)')}>{message.content}</span>
            </div>
          ) : (
            <div style={css('font-size:15px; line-height:1.625; color:var(--white)')}>
              <Markdown>{message.content}</Markdown>
            </div>
          )}

          {/* Attachment */}
          {message.attachment?.url && (
            <a href={message.attachment.view_url || message.attachment.url} target="_blank" rel="noopener noreferrer" style={css('display:inline-flex; align-items:center; gap:8px; margin-top:12px; padding:8px 12px; border:1px solid var(--border); border-radius:8px; font-size:12px; color:var(--white); text-decoration:none; background:var(--bg-surface); transition:background 0.2s;')} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card)'} onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}>
              <IC s={14} d='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' stroke="var(--green)" />
              Abrir {message.attachment.file_type === 'sheet' ? 'planilha' : 'PDF'}
            </a>
          )}

          {/* Sources / Query */}
          {!message.error && (message.query || (message.sources && message.sources.length > 0)) && (
            <details style={css('margin-top:16px; border:1px solid var(--border-faint); border-radius:12px; padding:10px 14px; background:var(--bg-surface); box-shadow:0 1px 2px rgba(0,0,0,0.02)')}>
              <summary style={css('cursor:pointer; font-size:11.5px; letter-spacing:1px; text-transform:uppercase; color:var(--muted-light); font-weight:600; display:flex; align-items:center; gap:8px')}>
                <SparklesIcon />
                Como cheguei nesse resultado
              </summary>
              {message.sources && message.sources.length > 0 && (
                <div style={css('display:flex; flex-wrap:wrap; gap:6px; margin-top:12px')}>
                  {message.sources.map((s, si) => (
                    <span key={si} style={css('display:inline-flex; align-items:center; gap:6px; padding:4px 9px; border-radius:20px; border:1px solid var(--border); background:var(--bg-panel); font-size:11.5px; color:var(--muted-light)')}><span style={css('width:5px; height:5px; border-radius:50%; background:var(--green-dim)')} />{s.label}{s.detail ? ` · ${s.detail}` : ''}</span>
                  ))}
                </div>
              )}
              {message.query && (
                <pre style={css("margin:12px 0 0; padding:14px; background:var(--bg-code); border:1px solid var(--border); border-radius:10px; overflow-x:auto; font-family:var(--font-mono); font-size:12px; line-height:1.7; color:var(--muted-light); white-space:pre-wrap; word-break:break-word")}>{message.query}</pre>
              )}
            </details>
          )}

          {/* Aviso de truncamento */}
          {!message.error && table && table.rows.length >= 2 && table.rows.length <= 5 && (
            <div style={css('display:flex; align-items:center; gap:8px; margin-top:12px; padding:10px 14px; background:rgba(201,162,39,.08); border:1px solid rgba(201,162,39,.18); border-radius:8px; font-size:12px; color:var(--gold)')}>
              <IC s={14} d='<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' stroke="var(--gold)" />
              <span>Resultados podem estar incompletos. Tente refinar sua pergunta para um período ou veículo específico.</span>
            </div>
          )}
        </div>

        {/* Chart */}
        {table && <AnswerChart table={table} on={chartOpen} onToggle={onToggleChart} />}

        {/* Floating Action Bar (visible on hover) */}
        {!message.error && (
          <AnimatePresence>
            {hovered && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 5 }} 
                style={css('position:absolute; bottom:-16px; left:-8px;')}
              >
                <FeedbackActions message={message} onSendFeedback={onSendFeedback} fbOpen={fbOpen} onToggleFb={() => setFbOpen(!fbOpen)} onRegenerate={onRegenerate} />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Feedback form */}
        {fbOpen && (
          <div style={css('margin-top:20px;')}>
            <FeedbackForm message={message} onSendFeedback={(m, r, c) => { onSendFeedback(m, r, c); setFbOpen(false); }} onClose={() => setFbOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  );
}

function MessageBubbleInner(props: MessageBubbleProps) {
  if (props.message.role === 'user') {
    return <UserBubble message={props.message} me={props.me} />;
  }
  return <AssistantBubble {...props} />;
}

export const MessageBubble = React.memo(MessageBubbleInner, (prev, next) => {
  return prev.message.message_id === next.message.message_id
    && prev.message.content === next.message.content
    && prev.message.fb === next.message.fb
    && prev.chartOpen === next.chartOpen
    && prev.onRegenerate === next.onRegenerate;
});
