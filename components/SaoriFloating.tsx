'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LifeBuoy } from 'lucide-react';
/**
 * Detecta emoção com base no conteúdo do texto.
 * Retorna uma das emoções mapeadas para emoji.
 */
function detectEmotion(text: string): string {
  const t = text.toLowerCase();

  if (/\b(uau|nossa|caramba|incrivel|impressionante|wow|puxa|eita|oxi)\b/.test(t) ||
      /[!]{2,}/.test(t)) return 'surprised';

  if (/\b(erro|falha|problema|bug|nao consigo|impossivel|droga|porcaria)\b/.test(t) ||
      /\b(infelizmente nao|nao foi possivel|nao e possivel)\b/.test(t)) return 'angry';

  if (/\b(cuidado|atencao|importante|aviso|alerta|risco|perigoso)\b/.test(t) ||
      /\b(verifique|confirme|certifique)\b/.test(t)) return 'confused';

  if (/\b(desculp|perdao|sinto muito|me perdoe|obrigad)\b/.test(t)) return 'shy';

  if (/\b(ajud|aqui pra voce|conte comigo|prazer|bem-vind|fique tranquil)\b/.test(t) ||
      /\b(nao se preocupe|sem problemas|tudo bem)\b/.test(t)) return 'explaining';

  if (/\b(hmm|acho que|talvez|depende|nao tenho certeza|pode ser)\b/.test(t) ||
      /\?{2,}/.test(t)) return 'thinking';

  if (/\b(sim|claro|com certeza|exato|isso|perfeito|pronto|funciona|sucesso)\b/.test(t)) return 'happy';

  if (/\b(ola|oi|bom dia|boa tarde|boa noite|fala|eai)\b/.test(t)) return 'greeting';

  return 'happy';
}



interface SaoriMsg {
  role: 'user' | 'saori';
  text: string;
}

/**
 * SaoriFloating — Logo Athena com emoji + efeitos 3D no canto inferior direito.
 *
 * - Logo Athena PNG com emoji de emoção flutuante
 * - Efeitos 3D via CSS (perspective, rotação, floating, sombra dinâmica)
 * - Clica: balões de fala + input + link pra FAQ
 */
export function SaoriFloating() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<SaoriMsg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Mensagem de boas-vindas
  useEffect(() => {
    if (expanded && messages.length === 0) {
      setMessages([{
        role: 'saori',
        text: 'Saudacoes! Sou Saori, sua guia da plataforma. Pela sabedoria do Olimpo, posso tirar suas duvidas ou te levar a Central de Ajuda!',
      }]);
      setCurrentEmotion('greeting');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // 3D tilt no hover (parallax via mouse position)
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!logoRef.current) return;
    const rect = logoRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setMousePos({ x: x * 12, y: y * -12 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
  }, []);

  // Cancela audio ao fechar ou desmontar
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

  useEffect(() => {
    return () => { stopAudio(); };
  }, [stopAudio]);

  const playAudioWithLipSync = useCallback(async (base64Audio: string) => {
    try {
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
      const res = await fetch('/api/saori/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const responseText = data.output || 'Hmm, nao consegui processar.';
      setMessages(prev => [...prev, { role: 'saori', text: responseText }]);
      setCurrentEmotion(detectEmotion(responseText));
      if (data.audio) await playAudioWithLipSync(data.audio);
    } catch {
      setMessages(prev => [...prev, { role: 'saori', text: 'Hmm, a coruja de Athena nao ouviu direito. Tenta novamente?' }]);
      setCurrentEmotion('angry');
    } finally { setThinking(false); }
  }, [input, thinking, playAudioWithLipSync]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);



  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      zIndex: 9999,
      display: 'flex', alignItems: 'flex-end', gap: 16,
    }}>

      {/* ---- CHAT PANEL (glassmorphism) ---- */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: 320,
            marginBottom: 12,
            background: 'rgba(12, 12, 20, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >

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
              }}>Saori</span>
              <span style={{
                color: '#666', fontSize: 11, fontWeight: 400,
              }}>Guia da Sabedoria</span>
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
                border: msg.role === 'saori'
                  ? '1px solid rgba(255,255,255,0.06)' : 'none',
                animation: 'saoriMsgIn 0.25s ease',
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
                placeholder="Pergunte a Saori..."
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
                color: '#666', fontSize: 12, cursor: 'pointer',
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
              <LifeBuoy size={14} /> Central de Ajuda
            </button>
          </div>
          </motion.div>
      )}

      {/* ---- LOGO ATHENA COM EMOJI + 3D ---- */}
      <div
        ref={logoRef}
        onClick={() => { if (expanded) stopAudio(); setExpanded(!expanded); }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'relative',
          cursor: 'pointer',
          perspective: '600px',
          marginBottom: 12,
        }}
      >
        {/* Container da logo com Framer Motion (Live2D-like) */}
        <motion.div
          animate={{
            y: isSpeaking || currentEmotion === 'explaining' ? [0, -8, 0] 
             : currentEmotion === 'surprised' ? [0, -12, 0]
             : currentEmotion === 'shy' ? [0, 4, 0]
             : [0, -4, 0],
            x: currentEmotion === 'angry' ? [0, -4, 4, -4, 4, 0] : 0,
            scale: currentEmotion === 'surprised' ? [1, 1.1, 1] 
                 : currentEmotion === 'shy' ? 0.95 
                 : isSpeaking ? [1, 1.05, 1] 
                 : (isHovered ? 1.08 : 1),
            rotateZ: currentEmotion === 'confused' ? [0, 10, -10, 0] 
                   : (isHovered && !isSpeaking ? [0, -4, 2, 0] : 0),
          }}
          transition={{
            y: { duration: currentEmotion === 'surprised' ? 0.6 : (isSpeaking || currentEmotion === 'explaining' ? 1.2 : 3), repeat: Infinity, ease: 'easeInOut' },
            x: { duration: 0.4, repeat: currentEmotion === 'angry' ? Infinity : 0, ease: 'easeInOut' },
            scale: { duration: isSpeaking || currentEmotion === 'surprised' ? 1 : 0.3, repeat: isSpeaking || currentEmotion === 'surprised' ? Infinity : 0, ease: 'easeInOut' },
            rotateZ: { duration: currentEmotion === 'confused' ? 2 : 0.4, repeat: currentEmotion === 'confused' ? Infinity : 0, ease: 'easeInOut' }
          }}
          style={{
            width: 80, height: 80,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
            transformStyle: 'preserve-3d',
            transform: isHovered
              ? `rotateY(${mousePos.x * 0.8}deg) rotateX(${mousePos.y * 0.8}deg)`
              : 'rotateY(0) rotateX(0)',
          }}
        >
          {/* Indicador de speaking (Aura brilhante) */}
          <AnimatePresence>
            {(isSpeaking || currentEmotion === 'angry' || currentEmotion === 'surprised') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: currentEmotion === 'angry' ? [0.6, 1, 0.6] : [0.4, 0.8, 0.4], 
                  scale: currentEmotion === 'surprised' ? [1, 1.3, 1] : [1, 1.2, 1] 
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: currentEmotion === 'angry' ? 0.5 : 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  inset: -12,
                  borderRadius: '50%',
                  background: currentEmotion === 'angry' 
                    ? 'radial-gradient(circle, rgba(221,0,4,0.6) 0%, rgba(221,0,4,0) 70%)'
                    : 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%)',
                  pointerEvents: 'none',
                  zIndex: -1,
                }}
              />
            )}
          </AnimatePresence>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/athena-logo.png"
            alt="Saori"
            style={{
              width: 72, height: 72,
              objectFit: 'contain',
              filter: `drop-shadow(0 12px 32px rgba(221,0,4,${isHovered || currentEmotion === 'angry' ? '0.6' : '0.25'})) drop-shadow(0 4px 12px rgba(0,0,0,0.5))`,
              transition: 'filter 0.3s',
              transform: 'translateZ(12px)',
            }}
          />
        </motion.div>
      </div>

      <style>{`
        @keyframes saoriPanelIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes saoriMsgIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0) rotateY(0) rotateX(0) scale(1); }
          50% { transform: translateY(-4px) rotateY(0) rotateX(0) scale(1); }
        }
        @keyframes logoPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 20px rgba(221,0,4,0.15); }
          50% { transform: scale(1.06); box-shadow: 0 6px 28px rgba(221,0,4,0.35); }
        }
        @keyframes emojiFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes speakRing {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default SaoriFloating;
