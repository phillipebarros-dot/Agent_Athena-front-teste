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

interface BeyonderFloatingProps {
  emotion?: string;
  speaking?: boolean;
}

/**
 * BeyonderFloating - Widget flutuante do assistente Beyonder.
 *
 * Minimizado: icone circular 80px com modelo Live2D.
 * Expandido: painel 360x520 com modelo + chat + input.
 * O Beyonder responde perguntas sobre a plataforma Athena.
 */
export function BeyonderFloating({ emotion = 'neutral' }: BeyonderFloatingProps) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<BeyonderMsg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState(emotion);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll no chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Saudacao inicial ao expandir
  useEffect(() => {
    if (expanded && messages.length === 0) {
      setMessages([{
        role: 'beyonder',
        text: 'Opa! Sou o Beyonder, assistente da plataforma Athena. Me pergunta qualquer coisa sobre as funcionalidades!',
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const playAudioWithLipSync = useCallback(async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;

      // Decodificar audio
      const binaryStr = atob(base64Audio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

      // Criar analyser pra lip sync
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

      source.onended = () => {
        setIsSpeaking(false);
        analyserRef.current = null;
      };
    } catch (err) {
      console.error('Erro ao reproduzir audio:', err);
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

      setMessages(prev => [...prev, { role: 'beyonder', text: data.output || 'Hmm, nao consegui processar isso.' }]);
      setCurrentEmotion('happy');

      // TTS com lip sync
      if (data.audio) {
        await playAudioWithLipSync(data.audio);
      }
    } catch (err) {
      console.error('Beyonder chat error:', err);
      setMessages(prev => [...prev, { role: 'beyonder', text: 'Ops, tive um problema. Tenta de novo?' }]);
      setCurrentEmotion('error');
    } finally {
      setThinking(false);
    }
  }, [input, thinking, playAudioWithLipSync]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: expanded ? 20 : 24,
        right: expanded ? 20 : 24,
        zIndex: 9999,
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {expanded ? (
        /* ---- PAINEL EXPANDIDO ---- */
        <div style={{
          width: 360, height: 540,
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(165deg, #0f0f1a 0%, #1a1028 50%, #0f0f1a 100%)',
          border: '1px solid rgba(221, 0, 4, 0.2)',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(221,0,4,0.08)',
          overflow: 'hidden',
          animation: 'beyonderFadeIn 0.3s ease',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: thinking ? '#f59e0b' : '#22c55e',
                boxShadow: `0 0 6px ${thinking ? '#f59e0b' : '#22c55e'}`,
                animation: thinking ? 'pulse 1.5s infinite' : 'none',
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0', letterSpacing: '0.3px' }}>
                Beyonder
              </span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#888', fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
            >
              ✕
            </button>
          </div>

          {/* Modelo Live2D */}
          <div style={{
            height: 180, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 80%, rgba(221,0,4,0.06) 0%, transparent 70%)',
          }}>
            <BeyonderLive2D
              emotion={currentEmotion}
              speaking={isSpeaking}
              expanded={true}
              analyserNode={analyserRef.current}
            />
          </div>

          {/* Area de mensagens */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.1) transparent',
          }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #dd0004 0%, #b30003 100%)'
                    : 'rgba(255,255,255,0.06)',
                  color: '#e8e8e8',
                  fontSize: 13, lineHeight: 1.5,
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  animation: 'beyonderMsgIn 0.25s ease',
                }}
              >
                {msg.text}
              </div>
            ))}
            {thinking && (
              <div style={{
                alignSelf: 'flex-start', maxWidth: '85%',
                padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', gap: 4, alignItems: 'center',
              }}>
                <span style={{ animation: 'dotPulse 1.4s infinite', animationDelay: '0s', width: 6, height: 6, borderRadius: '50%', background: '#888', display: 'inline-block' }} />
                <span style={{ animation: 'dotPulse 1.4s infinite', animationDelay: '0.2s', width: 6, height: 6, borderRadius: '50%', background: '#888', display: 'inline-block' }} />
                <span style={{ animation: 'dotPulse 1.4s infinite', animationDelay: '0.4s', width: 6, height: 6, borderRadius: '50%', background: '#888', display: 'inline-block' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.2)',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte ao Beyonder..."
              disabled={thinking}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '10px 14px',
                color: '#e0e0e0', fontSize: 13,
                outline: 'none', transition: 'border 0.2s',
              }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(221,0,4,0.4)'; }}
              onBlur={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
            />
            <button
              onClick={sendMessage}
              disabled={thinking || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                border: 'none',
                background: input.trim() && !thinking ? 'var(--red, #dd0004)' : 'rgba(255,255,255,0.06)',
                color: '#fff', fontSize: 16, cursor: input.trim() && !thinking ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      ) : (
        /* ---- ICONE MINIMIZADO ---- */
        <>
          <div onClick={() => setExpanded(true)} style={{
            width: 80, height: 80, cursor: 'pointer', position: 'relative',
          }}>
            <BeyonderLive2D
              emotion={currentEmotion}
              speaking={isSpeaking}
              expanded={false}
            />
          </div>
          <div
            onClick={() => setExpanded(true)}
            style={{
              position: 'absolute', bottom: -8, left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--red, #dd0004)',
              color: '#fff', fontSize: 8, fontWeight: 700,
              padding: '2px 6px', borderRadius: 4,
              whiteSpace: 'nowrap', letterSpacing: '0.5px',
              textTransform: 'uppercase', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(221,0,4,0.4)',
            }}
          >
            Beyonder
          </div>
        </>
      )}

      {/* Animacoes CSS */}
      <style>{`
        @keyframes beyonderFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes beyonderMsgIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default BeyonderFloating;
