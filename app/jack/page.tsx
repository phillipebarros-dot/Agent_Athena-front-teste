/**
 * Pagina do Jack in the Box - Assistente Virtual Live2D
 *
 * Integra: Live2D Canvas + Speech Bubble + Lip Sync + Emocoes + TTS + STT
 *
 * O Jack funciona como guia do sistema Athena:
 * - Explica funcionalidades e botoes
 * - Ajuda o usuario a tomar decisoes
 * - Responde duvidas sobre o uso do sistema
 * - Muda expressoes de acordo com o contexto
 * - Fala com voz natural (OpenAI TTS tts-1-hd, voz nova)
 */
'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { auth, api, AuthUser } from '@/lib/api';
import SpeechBubble from '@/components/jack/SpeechBubble';
import { LipSyncEngine } from '@/lib/lipsync';
import { detectEmotion, getExpressionFile, emotionLabel, JACK_HELP_PHRASES } from '@/lib/jack-emotions';
import type { Live2DCanvasHandle } from '@/components/jack/Live2DCanvas';

// Dynamic import para evitar SSR (PixiJS precisa de window)
const Live2DCanvas = dynamic(() => import('@/components/jack/Live2DCanvas'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: 500, height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.03)', borderRadius: 20,
    }}>
      <span style={{ color: 'var(--muted)', fontSize: 14 }}>Carregando Jack...</span>
    </div>
  ),
});

const JACK_GREETING = 'Ola! Eu sou o Jack, seu assistente virtual. Posso te guiar pelas funcionalidades da Athena, explicar botoes, ajudar com duvidas e muito mais. Como posso te ajudar?';

const QUICK_ACTIONS = [
  { label: 'Como exportar dados?', key: 'export' },
  { label: 'Como usar voz?', key: 'voice' },
  { label: 'Como criar conversa?', key: 'newchat' },
  { label: 'O que e a barra de contexto?', key: 'context' },
  { label: 'Como dar feedback?', key: 'feedback' },
  { label: 'Como ver graficos?', key: 'graph' },
  { label: 'O que e o Sheets?', key: 'sheets' },
  { label: 'Como acessar o admin?', key: 'admin' },
];

export default function JackPage() {
  const router = useRouter();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [input, setInput] = useState('');
  const [bubbleText, setBubbleText] = useState('');
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('smile');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const canvasRef = useRef<Live2DCanvasHandle>(null);
  const lipSyncRef = useRef<LipSyncEngine | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auth gate
  useEffect(() => {
    (async () => {
      try {
        const m = await auth.me();
        if (!m?.authenticated) { router.replace('/login'); return; }
        setMe(m as AuthUser);
      } catch { router.replace('/login'); }
      setChecking(false);
    })();
  }, [router]);

  // Lip sync engine
  useEffect(() => {
    lipSyncRef.current = new LipSyncEngine((value) => {
      canvasRef.current?.setMouthValue(value);
    });
    return () => { lipSyncRef.current?.stop(); };
  }, []);

  // Greeting quando modelo carrega
  const handleModelReady = useCallback(() => {
    setModelReady(true);
    setTimeout(() => {
      setBubbleText(JACK_GREETING);
      setBubbleVisible(true);
      setCurrentEmotion('smile');
      canvasRef.current?.setExpression('smile');
      speakText(JACK_GREETING);
    }, 500);
  }, []);

  // TTS: gerar audio e fazer lip sync
  const speakText = async (text: string) => {
    setIsSpeaking(true);
    try {
      const res = await api.tts(text.slice(0, 2000));
      if (res.audio) {
        await lipSyncRef.current?.startFromBase64(res.audio);
      }
    } catch (err) {
      console.warn('[Jack] TTS falhou:', err);
    }
    setIsSpeaking(false);
  };

  // Enviar mensagem
  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || sending) return;
    setInput('');
    setSending(true);

    // Verificar se e uma acao rapida
    const quickKey = QUICK_ACTIONS.find(a => a.label === msg)?.key;
    if (quickKey && JACK_HELP_PHRASES[quickKey]) {
      const response = JACK_HELP_PHRASES[quickKey];
      const emotion = detectEmotion(response);
      setCurrentEmotion(emotion);
      canvasRef.current?.setExpression(getExpressionFile(emotion));
      setBubbleText(response);
      setBubbleVisible(true);
      speakText(response);
      setSending(false);
      return;
    }

    // Enviar para o backend Athena
    try {
      const r = await api.chat({ message: `[Jack Assistant] O usuario precisa de ajuda com o sistema Athena. Responda de forma simples e direta, como um assistente amigavel. Pergunta: ${msg}`, conversation_id: `jack_${me?.email || 'anon'}` });
      const response = r.output || 'Hmm, nao consegui processar. Tenta de novo?';

      // Detectar emocao e aplicar expressao
      const emotion = detectEmotion(response);
      setCurrentEmotion(emotion);
      canvasRef.current?.setExpression(getExpressionFile(emotion));

      // Mostrar balao e falar
      setBubbleText(response);
      setBubbleVisible(true);
      speakText(response);
    } catch {
      const errMsg = 'Ops, tive um problema de conexao. Tenta novamente?';
      setCurrentEmotion('worried');
      canvasRef.current?.setExpression('worried');
      setBubbleText(errMsg);
      setBubbleVisible(true);
    }
    setSending(false);
  };

  // Speech-to-Text
  const toggleRecording = () => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setRecording(false);
      send(transcript);
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  if (checking) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#0a0a12', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#888', fontSize: 14 }}>Carregando...</span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh', background: 'linear-gradient(135deg, #0a0a12 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#fff', fontFamily: "'Inter', 'DM Sans', sans-serif", overflow: 'hidden',
    }}>
      {/* Header */}
      <header style={{
        padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,10,18,0.8)', backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/chat')} style={{
            background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13,
          }}>
            Voltar ao Chat
          </button>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Jack in the Box</h1>
          {modelReady && (
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(76,175,80,0.15)',
              color: '#4caf50', fontWeight: 600,
            }}>
              Online
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#666' }}>
          Emocao: {emotionLabel(currentEmotion as any)}
        </span>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '20px' }}>
        {/* Jack model + bubble */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <SpeechBubble text={bubbleText} visible={bubbleVisible} position="right" />
          <Live2DCanvas
            ref={canvasRef}
            width={500}
            height={600}
            onModelReady={handleModelReady}
          />
        </div>

        {/* Quick actions (lateral) */}
        <div style={{
          position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 240,
        }}>
          <span style={{ fontSize: 11, color: '#666', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Perguntas rapidas
          </span>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.key}
              onClick={() => send(action.label)}
              disabled={sending}
              style={{
                padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)', color: '#ccc', fontSize: 12, cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.2s', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.target as HTMLElement).style.borderColor = 'rgba(200,60,60,0.4)'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </main>

      {/* Input area */}
      <footer style={{
        padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(10,10,18,0.8)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', gap: 12, maxWidth: 680, width: '100%', margin: '0 auto',
      }}>
        <button
          onClick={toggleRecording}
          style={{
            width: 40, height: 40, borderRadius: '50%', border: 'none',
            background: recording ? 'rgba(200,60,60,0.3)' : 'rgba(255,255,255,0.06)',
            color: recording ? '#e74c3c' : '#888', cursor: 'pointer', fontSize: 18, flexShrink: 0,
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Falar por voz"
        >
          {recording ? '...' : '\u{1F3A4}'}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder={sending ? 'Jack esta pensando...' : 'Pergunte algo ao Jack...'}
          disabled={sending}
          style={{
            flex: 1, padding: '12px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 14, outline: 'none',
            fontFamily: 'inherit', transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.target as HTMLElement).style.borderColor = 'rgba(200,60,60,0.4)'}
          onBlur={(e) => (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'}
        />
        <button
          onClick={() => send(input)}
          disabled={sending || !input.trim()}
          style={{
            padding: '10px 20px', borderRadius: 12, border: 'none',
            background: sending || !input.trim() ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #c0392b, #e74c3c)',
            color: sending || !input.trim() ? '#555' : '#fff', cursor: sending || !input.trim() ? 'default' : 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.2s',
          }}
        >
          Enviar
        </button>
      </footer>
    </div>
  );
}
