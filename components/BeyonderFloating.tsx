'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const BeyonderLive2D = dynamic(
  () => import('./BeyonderLive2D').then(m => ({ default: m.BeyonderLive2D })),
  { ssr: false }
);

/**
 * Detecta emocao com base no conteudo do texto.
 * Retorna uma das 7 expressoes reais do modelo:
 * smile, angy, worried, blush, aww, oh, ehh
 */
function detectEmotion(text: string): string {
  const t = text.toLowerCase();

  // Surpresa / novidade
  if (/\b(uau|nossa|caramba|incrivel|impressionante|wow|puxa|eita|oxi)\b/.test(t) ||
      /[!]{2,}/.test(t)) return 'surprised';

  // Raiva / frustracaoa
  if (/\b(erro|falha|problema|bug|nao consigo|impossivel|droga|porcaria)\b/.test(t) ||
      /\b(infelizmente nao|nao foi possivel|nao e possivel)\b/.test(t)) return 'angry';

  // Preocupacao / duvida
  if (/\b(cuidado|atencao|importante|aviso|alerta|risco|perigoso)\b/.test(t) ||
      /\b(verifique|confirme|certifique)\b/.test(t)) return 'confused';

  // Vergonha / modestia
  if (/\b(desculp|perdao|sinto muito|me perdoe|obrigad)\b/.test(t)) return 'shy';

  // Fofura / empatia
  if (/\b(ajud|aqui pra voce|conte comigo|prazer|bem-vind|fique tranquil)\b/.test(t) ||
      /\b(nao se preocupe|sem problemas|tudo bem)\b/.test(t)) return 'explaining';

  // Confusao / pensamento
  if (/\b(hmm|acho que|talvez|depende|nao tenho certeza|pode ser)\b/.test(t) ||
      /\?{2,}/.test(t)) return 'thinking';

  // Feliz / positivo (default pra respostas normais)
  if (/\b(sim|claro|com certeza|exato|isso|perfeito|pronto|funciona|sucesso)\b/.test(t) ||
      /[😊🎉✅👍]/.test(t)) return 'happy';

  // Saudacao
  if (/\b(ola|oi|bom dia|boa tarde|boa noite|fala|eai)\b/.test(t)) return 'greeting';

  return 'happy';
}

interface BeyonderMsg {
  role: 'user' | 'beyonder';
  text: string;
}

/**
 * BeyonderFloating - Beyonder Live2D inteiro no canto inferior direito.
 *
 * - Modelo completo, sem circulo, sem corte
 * - Clica: baloes de fala + input + link pra FAQ
 * - Pode direcionar pra pagina /faq com todos os topicos
 */
export function BeyonderFloating() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<BeyonderMsg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (expanded && messages.length === 0) {
      setMessages([{
        role: 'beyonder',
        text: 'Opa! Sou o Beyonder. Posso tirar suas dúvidas sobre a Athena ou te levar pra Central de Ajuda!',
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
    } catch { setIsSpeaking(false); }
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
      const responseText = data.output || 'Hmm, nao consegui processar.';
      setMessages(prev => [...prev, { role: 'beyonder', text: responseText }]);
      setCurrentEmotion(detectEmotion(responseText));
      if (data.audio) await playAudioWithLipSync(data.audio);
    } catch {
      setMessages(prev => [...prev, { role: 'beyonder', text: 'Ops, tive um problema. Tenta de novo?' }]);
      setCurrentEmotion('angry');
    } finally { setThinking(false); }
  }, [input, thinking, playAudioWithLipSync]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  return (
    <div style={{
      position: 'fixed', bottom: 0, right: 40,
      zIndex: 9999,
      display: 'flex', alignItems: 'flex-end', gap: 0,
    }}>

      {/* ---- BALOES + INPUT (a esquerda do modelo) ---- */}
      {expanded && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          marginBottom: 20, marginRight: 4,
          width: 280,
          animation: 'beyonderBubbleIn 0.25s ease',
        }}>
          {/* Mensagens */}
          <div ref={scrollRef} style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            overflowY: 'auto', maxHeight: 260, padding: '4px 0',
            scrollbarWidth: 'none',
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '92%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: msg.role === 'user'
                  ? 'var(--red, #dd0004)'
                  : 'rgba(20, 20, 30, 0.95)',
                color: '#e0e0e0', fontSize: 13, lineHeight: 1.5,
                border: msg.role === 'beyonder' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                animation: 'beyonderMsgIn 0.2s ease',
              }}>
                {msg.text}
              </div>
            ))}
            {thinking && (
              <div style={{
                padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
                background: 'rgba(20, 20, 30, 0.95)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                display: 'flex', gap: 5,
              }}>
                {[0, 0.2, 0.4].map((d, i) => (
                  <span key={i} style={{
                    width: 5, height: 5, borderRadius: '50%', background: '#888',
                    display: 'inline-block', animation: `dotPulse 1.4s infinite ${d}s`,
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{
            display: 'flex', gap: 6, marginTop: 8, alignItems: 'center',
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte ao Beyonder..."
              disabled={thinking}
              style={{
                flex: 1, background: 'rgba(20, 20, 30, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '9px 12px',
                color: '#e0e0e0', fontSize: 13, outline: 'none',
                boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={thinking || !input.trim()}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: input.trim() && !thinking ? 'var(--red, #dd0004)' : 'rgba(255,255,255,0.08)',
                color: '#fff', fontSize: 14, flexShrink: 0,
                cursor: input.trim() && !thinking ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >↑</button>
          </div>

          {/* Link para FAQ */}
          <button
            onClick={() => router.push('/faq')}
            style={{
              marginTop: 8,
              background: 'rgba(20, 20, 30, 0.95)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '8px 14px',
              color: '#999', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = '#dd0004'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = '#999'; }}
          >
            📖 Ver Central de Ajuda completa
          </button>
        </div>
      )}

      {/* ---- MODELO LIVE2D (inteiro, sem circulo) ---- */}
      <div style={{ position: 'relative' }}>
        <div
          onClick={() => setExpanded(!expanded)}
          style={{ cursor: 'pointer' }}
        >
          <BeyonderLive2D
            emotion={currentEmotion}
            speaking={isSpeaking}
            analyserNode={analyserRef.current}
          />
        </div>

        {/* Label BEYONDER */}
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            position: 'absolute', bottom: 4, left: '50%',
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

        {/* Fechar quando expandido */}
        {expanded && (
          <button
            onClick={() => setExpanded(false)}
            style={{
              position: 'absolute', top: 0, right: 0,
              width: 20, height: 20, borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#888', fontSize: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        )}
      </div>

      <style>{`
        @keyframes beyonderBubbleIn {
          from { opacity: 0; transform: translateX(15px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes beyonderMsgIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

export default BeyonderFloating;
