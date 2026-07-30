'use client';
import React, { useState } from 'react';
import { B, IC, css } from '@/lib/dc';
import type { ChatMessage } from '@/lib/types';

interface FeedbackPanelProps {
  message: ChatMessage;
  onSendFeedback: (m: ChatMessage, rating: 'positive' | 'negative', comment?: string) => void;
}

export function FeedbackActions({ message, onSendFeedback, onToggleFb, onRegenerate }: FeedbackPanelProps & { fbOpen: boolean; onToggleFb: () => void; onRegenerate?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const doCopy = () => {
    navigator.clipboard?.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div style={css('display:flex; align-items:center; gap:4px; margin-top:8px')}>
      {onRegenerate && (
        <B t="button" title="Regenerar" onClick={onRegenerate} c="padding:4px 9px; border-radius:6px; border:1px solid var(--border); background:transparent; color:var(--muted); font-family:var(--font-body); font-size:11px; cursor:pointer; display:inline-flex; align-items:center; gap:5px" h="border-color:var(--red-dim); color:var(--white)">
          <IC s={12} d='<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>' w={2} />Regenerar
        </B>
      )}
      <B t="button" title="Ouvir" onClick={async () => { if (ttsLoading) return; setTtsLoading(true); await playTts(message.content); setTtsLoading(false); }} c="padding:4px 9px; border-radius:6px; border:1px solid var(--border); background:transparent; color:var(--muted); font-family:var(--font-body); font-size:11px; cursor:pointer; display:inline-flex; align-items:center; gap:5px" h="border-color:var(--red-dim); color:var(--white)">
        <IC s={12} d='<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' w={2} />{ttsLoading ? 'Gerando…' : 'Ouvir'}
      </B>
      <B t="button" title="Copiar" onClick={doCopy} c={`padding:4px 9px; border-radius:6px; border:1px solid ${copied ? 'var(--green-dim)' : 'var(--border)'}; background:transparent; color:${copied ? 'var(--green)' : 'var(--muted)'}; font-family:var(--font-body); font-size:11px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; transition:all .2s`} h="border-color:var(--red-dim); color:var(--white)">
        {copied
          ? <><IC s={12} d='<polyline points="20 6 9 17 4 12"/>' w={2} />Copiado!</>
          : <><IC s={12} d='<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' w={2} />Copiar</>
        }
      </B>
      <span style={css('width:1px; height:14px; background:var(--border); margin:0 3px')} />
      <B t="button" title="Resposta útil" onClick={() => onSendFeedback(message, 'positive')} c={`padding:4px 8px; border-radius:6px; border:1px solid ${message.fb === 'positive' ? 'var(--green-dim)' : 'var(--border)'}; background:transparent; color:${message.fb === 'positive' ? 'var(--green)' : 'var(--muted)'}; cursor:pointer; display:inline-flex`} h="border-color:var(--green-dim); color:var(--green)">
        <IC s={13} d='<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>' />
      </B>
      <B t="button" title="Corrigir a Athena" onClick={() => onToggleFb()} c={`padding:4px 8px; border-radius:6px; border:1px solid ${message.fb === 'negative' ? 'var(--red-dim)' : 'var(--border)'}; background:transparent; color:${message.fb === 'negative' ? 'var(--red)' : 'var(--muted)'}; cursor:pointer; display:inline-flex`} h="border-color:var(--red-dim); color:var(--red)">
        <IC s={13} d='<path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>' />
      </B>
    </div>
  );
}

export function FeedbackForm({ message, onSendFeedback, onClose }: FeedbackPanelProps & { onClose: () => void }) {
  const [comment, setComment] = useState('');
  return (
    <div style={css('margin-top:10px; border:1px solid var(--border-subtle); border-radius:10px; background:var(--bg-quiet, var(--bg-panel)); padding:12px')}>
      <div style={css('font-size:12px; font-weight:600; margin-bottom:8px')}>O que estava errado? Sua correção vira aprendizado.</div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Ex.: o status do PI deveria incluir Aprovado, não só Faturado." style={css("width:100%; resize:vertical; background:var(--bg-input); border:1px solid var(--border); border-radius:8px; padding:9px 11px; color:var(--white); font-family:var(--font-body); font-size:13px; outline:none")} />
      <div style={css('display:flex; gap:8px; margin-top:9px')}>
        <B t="button" onClick={() => onSendFeedback(message, 'negative', comment)} c="padding:7px 14px; border:none; border-radius:8px; background:var(--red); color:#fff; font-family:var(--font-body); font-size:12px; font-weight:600; cursor:pointer" h="background:var(--red-dim)">Enviar correção</B>
        <B t="button" onClick={onClose} c="padding:7px 12px; border:1px solid var(--border); border-radius:8px; background:transparent; color:var(--muted-light); font-family:var(--font-body); font-size:12px; cursor:pointer" h="color:var(--white)">Cancelar</B>
      </div>
    </div>
  );
}

// TTS helper
async function playTts(text: string) {
  try {
    const { api } = await import('@/lib/api');
    const r = await api.tts(text.slice(0, 4000));
    if (r?.audio) {
      const audio = new Audio(`data:audio/mp3;base64,${r.audio}`);
      await audio.play().catch(() => {});
    }
  } catch { /* silencioso */ }
}
