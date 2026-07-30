'use client';
import React, { useEffect, useRef } from 'react';
import { css } from '@/lib/dc';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { HistorySkeleton, ThinkingIndicator } from './SkeletonLoaders';

interface MessageListProps {
  messages: ChatMessage[];
  me: { name?: string; email?: string } | null;
  sending: boolean;
  loadingHist: boolean;
  onSendFeedback: (m: ChatMessage, rating: 'positive' | 'negative', comment?: string) => void;
  onRegenerate: (m: ChatMessage) => void;
  chartView: Record<string, boolean>;
  onToggleChart: (messageId: string) => void;
}

export function MessageList({ messages, me, sending, loadingHist, onSendFeedback, onRegenerate, chartView, onToggleChart }: MessageListProps) {
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
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <HistorySkeleton count={4} />
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
                onRegenerate={() => onRegenerate(m)}
                chartOpen={!!chartView[m.message_id]}
                onToggleChart={() => onToggleChart(m.message_id)}
              />
            </motion.div>
          ))}

          {/* Premium Thinking indicator — shimmer skeleton */}
          {sending && (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 12 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <ThinkingIndicator label="Analisando dados…" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
