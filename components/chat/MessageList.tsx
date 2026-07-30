'use client';
import React, { useEffect, useRef } from 'react';
import { css } from '@/lib/dc';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

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
  }, [messages, loadingHist, sending]);

  return (
    <div ref={scrollRef} style={css('flex:1; overflow-y:auto; overflow-x:hidden; padding:28px 24px 8px; scroll-behavior: smooth;')}>
      <div style={css('max-width:760px; margin:0 auto; display:flex; flex-direction:column; gap:22px')}>
        <AnimatePresence initial={false}>
          {loadingHist && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              style={css('text-align:center; font-size:12px; color:var(--muted); padding:20px')}
            >
              Carregando histórico…
            </motion.div>
          )}

          {messages.map((m) => (
            <motion.div
              key={m.message_id}
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <MessageBubble
                message={m}
                me={me}
                onSendFeedback={onSendFeedback}
                chartOpen={!!chartView[m.message_id]}
                onToggleChart={() => onToggleChart(m.message_id)}
              />
            </motion.div>
          ))}

          {/* Premium Thinking indicator (Framer Motion Staggered Dots) */}
          {sending && (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              style={css('display:flex; gap:14px; align-items:flex-start')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/athena-logo.png" alt="Athena" style={css('width:38px; height:38px; object-fit:contain; flex-shrink:0; margin-top:1px')} />
              
              <div style={css('display:flex; align-items:center; gap:8px; padding:14px 16px; background:transparent; border:none;')}>
                <motion.div
                  style={css('display:flex; gap:6px; align-items:center;')}
                  variants={{
                    start: { transition: { staggerChildren: 0.15 } }
                  }}
                  initial="start"
                  animate="start"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--red)',
                      }}
                      variants={{
                        start: {
                          y: [0, -6, 0],
                          opacity: [0.4, 1, 0.4],
                          scale: [0.85, 1.1, 0.85],
                        }
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </motion.div>
                <span style={css('font-size:12px; color:var(--muted); margin-left:8px; font-weight:500')}>Pensando…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
