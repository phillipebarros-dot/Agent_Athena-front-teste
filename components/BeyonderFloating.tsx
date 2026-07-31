'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

const BeyonderLive2D = dynamic(
  () => import('./BeyonderLive2D').then(m => ({ default: m.BeyonderLive2D })),
  { ssr: false }
);

interface BeyonderMsg {
  role: 'user' | 'beyonder';
  text: string;
}

/**
 * BeyonderFloating - Beyonder sentado livre no canto inferior direito.
 *
 * Minimizado: modelo Live2D completo, sem circulo, sem borda, livre.
 * Expandido: modelo grande + painel de chat ao lado esquerdo + balao de fala.
 */
export function BeyonderFloating() {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<BeyonderMsg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [showBubble, setShowBubble] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll no chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mostrar balao apos 2s no minimizado
  useEffect(() => {
    if (!expanded && messages.length === 0) {
      bubbleTimerRef.current = setTimeout(() => setShowBubble(true), 2000);
    } else {
      setShowBubble(false);
    }
    return () => { if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current); };
  }, [expanded, messages.length]);

  // Saudacao ao expandir
  useEffect(() => {
    if (expanded && messages.length === 0) {
      setMessages([{
        role: 'beyonder',
        text: 'Opa! Sou o Beyonder. Me pergunta qualquer coisa sobre as funcionalidades da Athena!',
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const playAudioWithLipSync = useCallback(async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      const ctx = audioContextRef.current;

      const binaryStr = atob(base64Audio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      analyserRef.current = analyser;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      setIsSpeaking(true);
      source.start();
      source.onended = () => { setIsSpeaking(false); analyserRef.current = null; };
    } catch (err) {
      console.error('Erro audio:', err);
      setIsSpeaking(false);
    }
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || thinking) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setThinking(true);
    setCurrentEmotion('thinking');

    try {
      const res = await fetch('/api/beyonder/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setMessages(prev => [...prev, { role: 'beyonder', text: data.output || 'Hmm, nao consegui processar.' }]);
      setCurrentEmotion('happy');

      if (data.audio) await playAudioWithLipSync(data.audio);
    } catch {
      setMessages(prev => [...prev, { role: 'beyonder', text: 'Ops, tive um problema. Tenta de novo?' }]);
      setCurrentEmotion('error');
    } finally {
      setThinking(false);
    }
  }, [input, thinking, playAudioWithLipSync]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      right: expanded ? 20 : 16,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'flex-end',
      gap: 0,
      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>

      {/* ---- CHAT PANEL (aparece a esquerda do modelo quando expandido) ---- */}
      {expanded && (
        <div style={{
          width: 340,
          height: 420,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(10, 10, 18, 0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px 16px 16px 4px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          marginBottom: 40,
          animation: 'beyonderChatIn 0.3s ease',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: thinking ? '#f59e0b' : '#22c55e',
                boxShadow: `0 0 6px ${thinking ? '#f59e0b' : '#22c55e'}`,
              }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#ccc', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Beyonder
              </span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              style={{
                width: 24, height: 24, borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: '#666',
                fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
          </div>

          {/* Mensagens */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px',
            display: 'flex', flexDirection: 'column', gap: 8,
            scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent',
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                padding: '9px 13px',
                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: msg.role === 'user'
                  ? 'var(--red, #dd0004)'
                  : 'rgba(255,255,255,0.07)',
                color: '#e0e0e0', fontSize: 13, lineHeight: 1.5,
                animation: 'beyonderMsgIn 0.2s ease',
              }}>
                {msg.text}
              </div>
            ))}
            {thinking && (
              <div style={{
                alignSelf: 'flex-start', padding: '10px 14px',
                borderRadius: '12px 12px 12px 4px',
                background: 'rgba(255,255,255,0.07)',
                display: 'flex', gap: 5,
              }}>
                <span style={{ ...dotStyle, animationDelay: '0s' }} />
                <span style={{ ...dotStyle, animationDelay: '0.2s' }} />
                <span style={{ ...dotStyle, animationDelay: '0.4s' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '8px 10px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte ao Beyonder..."
              disabled={thinking}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '9px 12px',
                color: '#e0e0e0', fontSize: 13, outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={thinking || !input.trim()}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: input.trim() && !thinking ? 'var(--red, #dd0004)' : 'rgba(255,255,255,0.06)',
                color: '#fff', fontSize: 14, cursor: input.trim() && !thinking ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >↑</button>
          </div>
        </div>
      )}

      {/* ---- MODELO LIVE2D (sempre visivel, sem circulo) ---- */}
      <div style={{ position: 'relative' }}>

        {/* Balao de fala no minimizado */}
        {!expanded && showBubble && (
          <div style={{
            position: 'absolute',
            bottom: expanded ? 'auto' : '65%',
            right: '105%',
            minWidth: 200, maxWidth: 260,
            padding: '10px 14px',
            background: 'rgba(10, 10, 18, 0.92)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px 12px 4px 12px',
            fontSize: 12, lineHeight: 1.5, color: '#d0d0d0',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            animation: 'beyonderBubbleIn 0.3s ease',
            cursor: 'pointer',
          }}
          onClick={() => { setShowBubble(false); setExpanded(true); }}
          >
            Estou aqui para tirar dúvidas sobre as funções do Agent Athena! 💡
            {/* Seta apontando pra direita (pro modelo) */}
            <div style={{
              position: 'absolute', right: -6, bottom: 14,
              width: 0, height: 0,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderLeft: '6px solid rgba(10, 10, 18, 0.92)',
            }} />
          </div>
        )}

        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            width: expanded ? 200 : 120,
            height: expanded ? 320 : 180,
            cursor: 'pointer',
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            /* SEM circulo, SEM borda, SEM overflow hidden */
          }}
        >
          <BeyonderLive2D
            emotion={currentEmotion}
            speaking={isSpeaking}
            expanded={expanded}
            analyserNode={analyserRef.current}
          />
        </div>

        {/* Label BEYONDER (minimizado) */}
        {!expanded && (
          <div
            onClick={() => setExpanded(true)}
            style={{
              position: 'absolute', bottom: 2, left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--red, #dd0004)',
              color: '#fff', fontSize: 7, fontWeight: 700,
              padding: '2px 8px', borderRadius: 4,
              whiteSpace: 'nowrap', letterSpacing: '0.8px',
              textTransform: 'uppercase', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(221,0,4,0.4)',
            }}
          >
            Beyonder
          </div>
        )}
      </div>

      {/* Animacoes */}
      <style>{`
        @keyframes beyonderChatIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes beyonderMsgIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes beyonderBubbleIn {
          from { opacity: 0; transform: translateX(10px) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

const dotStyle: React.CSSProperties = {
  width: 5, height: 5, borderRadius: '50%',
  background: '#888', display: 'inline-block',
  animation: 'dotPulse 1.4s infinite',
};

export default BeyonderFloating;
