'use client';
import React, { useEffect, useRef } from 'react';
import { css } from '@/lib/dc';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '@/lib/types';

interface MessageListProps {
  messages: ChatMessage[];
  me: { name?: string; email?: string } | null;
  sending: boolean;
  loadingHist: boolean;
  onSendFeedback: (m: ChatMessage, rating: 'positive' | 'negative', comment?: string) => void;
  chartView: Record<string, boolean>;
  onToggleChart: (messageId: string) => void;
}

export function MessageList({ messages, me, sending, loadingHist, onSendFeedback, chartView, onToggleChart }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loadingHist]);

  return (
    <div ref={scrollRef} style={css('flex:1; overflow-y:auto; overflow-x:hidden; padding:28px 24px 8px')}>
      <div style={css('max-width:760px; margin:0 auto; display:flex; flex-direction:column; gap:22px')}>
        {loadingHist && <div style={css('text-align:center; font-size:12px; color:var(--muted); padding:20px')}>Carregando histórico…</div>}

        {messages.map((m) => (
          <MessageBubble
            key={m.message_id}
            message={m}
            me={me}
            onSendFeedback={onSendFeedback}
            chartOpen={!!chartView[m.message_id]}
            onToggleChart={() => onToggleChart(m.message_id)}
          />
        ))}

        {/* Thinking indicator */}
        {sending && (
          <div style={css('display:flex; gap:14px; align-items:flex-start')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/athena-logo.png" alt="Athena" style={css('width:38px; height:38px; object-fit:contain; flex-shrink:0; margin-top:1px')} />
            <div style={css('display:flex; align-items:center; gap:8px; padding:14px 16px; background:var(--bg-card); border:1px solid var(--border); border-radius:4px 12px 12px 12px')}>
              <span style={{ ...css('width:6px; height:6px; border-radius:50%; background:var(--red)'), animation: 'thinkDot 1.25s ease-in-out infinite' }} />
              <span style={{ ...css('width:6px; height:6px; border-radius:50%; background:var(--red)'), animation: 'thinkDot 1.25s ease-in-out .18s infinite' }} />
              <span style={{ ...css('width:6px; height:6px; border-radius:50%; background:var(--red)'), animation: 'thinkDot 1.25s ease-in-out .36s infinite' }} />
              <span style={css('font-size:12px; color:var(--muted); margin-left:4px')}>Consultando o Publi…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
