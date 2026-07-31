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
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Mensagem de boas-vindas (sem acentos pra evitar encoding)
  useEffect(() => {
    if (expanded && messages.length === 0) {
      setMessages([{
        role: 'beyonder',
        text: 'Opa! Sou o Beyonder. Posso tirar suas duvidas sobre a Athena ou te levar pra Central de Ajuda!',
      }]);
      setCurrentEmotion('greeting');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // Cancela audio ao fechar o painel ou desmontar
  const stopAudio = useCallback(() => {
    try {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
    } catch { /* node ja parado */ }
    setIsSpeaking(false);
    analyserRef.current = null;
  }, []);

  // Cleanup no unmount
  useEffect(() => {
    return () => { stopAudio(); };
  }, [stopAudio]);

  const playAudioWithLipSync = useCallback(async (base64Audio: string) => {
    try {
      // Cancela audio anterior se existir
      stopAudio();

      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

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
      sourceNodeRef.current = source;

      setIsSpeaking(true);
      source.start();
      source.onended = () => {
        setIsSpeaking(false);
        analyserRef.current = null;
        sourceNodeRef.current = null;
      };
    } catch { setIsSpeaking(false); }
  }, [stopAudio]);

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
      position: 'fixed', bottom: 0, right: 24,
      zIndex: 9999,
      display: 'flex', alignItems: 'flex-end', gap: 0,
    }}>

      {/* ---- CHAT PANEL (glassmorphism) ---- */}
      {expanded && (
        <div style={{
          width: 320,
          marginBottom: 12, marginRight: -8,
          background: 'rgba(12, 12, 20, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'beyonderPanelIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(221, 0, 4, 0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 6px rgba(34,197,94,0.5)',
              }} />
              <span style={{
                color: '#e0e0e0', fontSize: 13, fontWeight: 600,
                letterSpacing: '0.3px',
              }}>Beyonder</span>
              <span style={{
                color: '#666', fontSize: 11, fontWeight: 400,
              }}>Assistente</span>
            </div>
            <button
              onClick={() => { stopAudio(); setExpanded(false); }}
              style={{
                background: 'transparent', border: 'none',
                color: '#666', fontSize: 16, cursor: 'pointer',
                width: 24, height: 24, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = '#fff'; (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = '#666'; (e.target as HTMLElement).style.background = 'transparent'; }}
            >✕</button>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} style={{
            flex: 1,
            display: 'flex', flexDirection: 'column', gap: 8,
            overflowY: 'auto', padding: '12px 14px',
            minHeight: 160, maxHeight: 280,
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.08) transparent',
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user'
                  ? '14px 14px 4px 14px'
                  : '14px 14px 14px 4px',
                background: msg.role === 'user'
                  ? 'var(--red, #dd0004)'
                  : 'rgba(255, 255, 255, 0.04)',
                color: msg.role === 'user' ? '#fff' : '#d0d0d0',
                fontSize: 13, lineHeight: 1.55,
                border: msg.role === 'beyonder'
                  ? '1px solid rgba(255,255,255,0.06)' : 'none',
                animation: 'beyonderMsgIn 0.25s ease',
              }}>
                {msg.text}
              </div>
            ))}
            {thinking && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '14px 14px 14px 4px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', gap: 5, alignSelf: 'flex-start',
              }}>
                {[0, 0.2, 0.4].map((d, i) => (
                  <span key={i} style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: '#888', display: 'inline-block',
                    animation: `dotPulse 1.4s infinite ${d}s`,
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* Input area */}
          <div style={{
            padding: '10px 14px 12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.15)',
          }}>
            <div style={{
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
                  borderRadius: 10, padding: '10px 14px',
                  color: '#e0e0e0', fontSize: 13, outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(221,0,4,0.4)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              />
              <button
                onClick={sendMessage}
                disabled={thinking || !input.trim()}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  border: 'none', flexShrink: 0,
                  background: input.trim() && !thinking
                    ? 'var(--red, #dd0004)'
                    : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  cursor: input.trim() && !thinking ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: input.trim() && !thinking
                    ? '0 2px 12px rgba(221,0,4,0.3)' : 'none',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </button>
            </div>

            {/* Link para FAQ */}
            <button
              onClick={() => router.push('/faq')}
              style={{
                marginTop: 8, width: '100%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8, padding: '7px 12px',
                color: '#666', fontSize: 11, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.color = '#dd0004';
                (e.target as HTMLElement).style.borderColor = 'rgba(221,0,4,0.2)';
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.color = '#666';
                (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
              }}
            >
              📖 Central de Ajuda
            </button>
          </div>
        </div>
      )}

      {/* ---- MODELO LIVE2D (inteiro, sem circulo) ---- */}
      <div style={{ position: 'relative' }}>
        <div
          onClick={() => { if (expanded) stopAudio(); setExpanded(!expanded); }}
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
      </div>

      <style>{`
        @keyframes beyonderPanelIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
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

