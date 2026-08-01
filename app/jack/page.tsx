/**
 * Pagina dA Saori - Assistente Virtual Live2D com personalidade Marvel
 *
 * A Saori (inspirado no personagem da Secret Wars) e o guia cosmico
 * do sistema Athena. Ele conhece TODAS as funcionalidades, botoes e fluxos
 * do frontend, entende roles de usuario (admin/user), e explica tudo
 * de forma que qualquer pessoa entenda.
 *
 * Integra: Live2D + Speech Bubble + Lip Sync + Emocoes + TTS + STT
 *          + Knowledge Base completa + Personalidade Marvel
 */
'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { auth, api } from '@/lib/api';
import SpeechBubble from '@/components/jack/SpeechBubble';
import { LipSyncEngine } from '@/lib/lipsync';
import { detectEmotion, getExpressionFile, emotionLabel, SaoriEmotion } from '@/lib/jack-emotions';
import {
  SAORI_SYSTEM_PROMPT,
  generateFeatureContext,
  searchFeatures,
  ROLE_DESCRIPTIONS,
  featuresByArea,
} from '@/lib/saori-knowledge';
import type { Live2DCanvasHandle } from '@/components/jack/Live2DCanvas';

// Dynamic import para evitar SSR (PixiJS precisa de window)
const Live2DCanvas = dynamic(() => import('@/components/jack/Live2DCanvas'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: 500, height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.03)', borderRadius: 20,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>&#x2728;</div>
        <span style={{ color: '#888', fontSize: 14 }}>A Saori esta chegando do Alem...</span>
      </div>
    </div>
  ),
});

const SAORI_GREETING = 'Saudacoes, humano! Eu sou A Saori, vim do Alem para ser seu guia na Athena. Conhego cada botao, cada funcionalidade, cada atalho deste sistema. Pergunte o que quiser, desde "como exportar dados" ate "o que faz o botao verde". Nada esta alem do meu conhecimento... bem, quase nada.';

// Acoes rapidas organizadas por categoria
const QUICK_CATEGORIES = [
  {
    label: 'Chat e Conversas',
    items: [
      { label: 'Como criar uma conversa nova?', key: 'new_conversation' },
      { label: 'Como renomear conversa?', key: 'rename_conversation' },
      { label: 'Como fixar conversa?', key: 'pin_conversation' },
      { label: 'Como parar a geracao?', key: 'stop_generation' },
    ],
  },
  {
    label: 'Dados e Export',
    items: [
      { label: 'Como exportar para Sheets?', key: 'export_sheets' },
      { label: 'Como exportar CSV/Excel?', key: 'export_csv' },
      { label: 'Como ver em grafico?', key: 'chart_view' },
      { label: 'O que e a barra de contexto?', key: 'context_bar' },
    ],
  },
  {
    label: 'Voz e Upload',
    items: [
      { label: 'Como usar voz?', key: 'voice_input' },
      { label: 'Como ouvir resposta?', key: 'voice_output' },
      { label: 'Como fazer upload de PDF?', key: 'upload_pdf' },
    ],
  },
  {
    label: 'Admin e Usuarios',
    items: [
      { label: 'O que e o painel admin?', key: 'admin_dashboard' },
      { label: 'Qual minha role?', key: 'my_role' },
      { label: 'Quais sao os atalhos?', key: 'shortcuts' },
    ],
  },
];

export default function SaoriPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [input, setInput] = useState('');
  const [bubbleText, setBubbleText] = useState('');
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<SaoriEmotion>('smile');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  const canvasRef = useRef<Live2DCanvasHandle>(null);
  const lipSyncRef = useRef<LipSyncEngine | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auth gate
  useEffect(() => {
    (async () => {
      try {
        const m = await auth.me();
        if (!m?.authenticated) { router.replace('/login'); return; }
        setMe(m);
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
      setBubbleText(SAORI_GREETING);
      setBubbleVisible(true);
      setCurrentEmotion('smile');
      canvasRef.current?.setExpression('smile');
      speakText(SAORI_GREETING);
    }, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TTS: gerar audio e fazer lip sync
  const speakText = async (text: string) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      const res = await api.tts(text.slice(0, 2000));
      if (res.audio) {
        await lipSyncRef.current?.startFromBase64(res.audio);
      }
    } catch (err) {
      console.warn('[Saori] TTS falhou:', err);
    }
    setIsSpeaking(false);
  };

  // Aplicar emocao ao modelo
  const applyEmotion = (emotion: SaoriEmotion) => {
    setCurrentEmotion(emotion);
    canvasRef.current?.setExpression(getExpressionFile(emotion));
  };

  // Responder com base na knowledge base (sem ir ao backend)
  const answerFromKnowledge = (featureKey: string): string | null => {
    // Atalhos especiais
    if (featureKey === 'my_role') {
      const role = me?.admin ? 'admin' : 'user';
      const desc = ROLE_DESCRIPTIONS[role];
      return `Voce e ${me?.name || me?.email || 'usuario'}. Sua role e "${role}". ${desc} ${me?.admin ? 'Voce tem acesso total ao painel /admin, onde pode ver auditoria, gerenciar dominios, sinonimos e usuarios.' : 'Se precisar de acesso admin, peca a um administrador do sistema.'}`;
    }
    if (featureKey === 'shortcuts') {
      return 'Os atalhos de teclado sao: Ctrl+N (nova conversa), Ctrl+B (abrir/fechar sidebar), Ctrl+K (buscar conversas), Ctrl+Shift+S (parar geracao), Enter (enviar), Shift+Enter (nova linha). Tudo pra voce nao precisar tirar a mao do teclado.';
    }
    // Buscar na base de features
    const features = searchFeatures(featureKey);
    const feature = features.find(f => f.id === featureKey);
    if (!feature) return null;
    let response = `${feature.description} ${feature.howTo}`;
    if (feature.tip) response += ` Dica: ${feature.tip}`;
    return response;
  };

  // Enviar mensagem
  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || sending) return;
    setInput('');
    setSending(true);
    setBubbleVisible(false);

    // Verificar se e uma acao rapida da knowledge base
    for (const cat of QUICK_CATEGORIES) {
      const action = cat.items.find(a => a.label === msg);
      if (action) {
        const answer = answerFromKnowledge(action.key);
        if (answer) {
          applyEmotion(detectEmotion(answer));
          setBubbleText(answer);
          setBubbleVisible(true);
          speakText(answer);
          setSending(false);
          return;
        }
      }
    }

    // Tentar responder localmente com busca na knowledge base
    const localResults = searchFeatures(msg);
    if (localResults.length === 1) {
      const f = localResults[0];
      let answer = `${f.description} ${f.howTo}`;
      if (f.tip) answer += ` Dica: ${f.tip}`;
      applyEmotion(detectEmotion(answer));
      setBubbleText(answer);
      setBubbleVisible(true);
      speakText(answer);
      setSending(false);
      return;
    }

    // Construir prompt com personalidade + knowledge base + contexto do usuario
    const userContext = [
      `Usuario: ${me?.name || me?.email || 'desconhecido'}`,
      `Email: ${me?.email || 'desconhecido'}`,
      `Role: ${me?.admin ? 'admin (acesso total, incluindo /admin)' : 'user (acesso padrao, sem /admin)'}`,
    ].join('\n');

    const featureCtx = generateFeatureContext();

    const fullPrompt = [
      SAORI_SYSTEM_PROMPT,
      '',
      'CONTEXTO DO USUARIO ATUAL:',
      userContext,
      '',
      featureCtx,
      '',
      `PERGUNTA DO USUARIO: ${msg}`,
    ].join('\n');

    // Enviar para o backend Athena
    try {
      const r = await api.chat({
        message: fullPrompt,
        conversation_id: `saori_${me?.email || 'anon'}`,
      });
      const response = r.output || 'Hmm, ate meus poderes cosmicos falharam nessa. Tenta reformular?';

      applyEmotion(detectEmotion(response));
      setBubbleText(response);
      setBubbleVisible(true);
      speakText(response);
    } catch {
      applyEmotion('worried');
      const errMsg = 'Parece que o Multiverso esta instavel. Estou com problemas de conexao com o servidor. Tenta de novo em alguns segundos?';
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
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
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
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'linear-gradient(135deg, #0a0a12 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#fff', fontFamily: "'Inter', 'DM Sans', sans-serif", overflow: 'hidden',
    }}>
      {/* Header */}
      <header style={{
        padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,10,18,0.8)', backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/chat')} style={{
            background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13,
            padding: '6px 12px', borderRadius: 6, transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={(e) => (e.target as HTMLElement).style.background = 'none'}
          >
            Voltar ao Chat
          </button>
          <span style={{ color: 'rgba(255,255,255,0.12)' }}>|</span>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>Saori</h1>
          <span style={{ fontSize: 10, color: '#555', fontStyle: 'italic' }}>from Beyond</span>
          {modelReady && (
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(76,175,80,0.15)',
              color: '#4caf50', fontWeight: 600,
            }}>
              Online
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {me && (
            <span style={{ fontSize: 11, color: '#555' }}>
              {me.name || me.email} ({me.admin ? 'admin' : 'user'})
            </span>
          )}
          {isSpeaking && (
            <span style={{ fontSize: 10, color: '#e74c3c', fontWeight: 500 }}>Falando...</span>
          )}
          <span style={{ fontSize: 11, color: '#444' }}>
            {emotionLabel(currentEmotion)}
          </span>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '20px' }}>
        {/* Saori model + bubble */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <SpeechBubble text={bubbleText} visible={bubbleVisible} position="right" />
          <Live2DCanvas
            ref={canvasRef}
            width={500}
            height={600}
            onModelReady={handleModelReady}
          />
        </div>

        {/* Quick actions - categorias com tabs */}
        <div style={{
          position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 260, width: 260,
        }}>
          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
            {QUICK_CATEGORIES.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveCategory(i)}
                style={{
                  padding: '4px 10px', borderRadius: 8, border: 'none',
                  background: activeCategory === i ? 'rgba(200,60,60,0.2)' : 'rgba(255,255,255,0.04)',
                  color: activeCategory === i ? '#e74c3c' : '#666',
                  fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                  transition: 'all 0.2s',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Items da categoria ativa */}
          {QUICK_CATEGORIES[activeCategory].items.map((action) => (
            <button
              key={action.key}
              onClick={() => send(action.label)}
              disabled={sending}
              style={{
                padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)', color: '#bbb', fontSize: 12, cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.2s', fontFamily: 'inherit', lineHeight: 1.4,
              }}
              onMouseEnter={(e) => {
                const t = e.target as HTMLElement;
                t.style.background = 'rgba(255,255,255,0.08)';
                t.style.borderColor = 'rgba(200,60,60,0.3)';
              }}
              onMouseLeave={(e) => {
                const t = e.target as HTMLElement;
                t.style.background = 'rgba(255,255,255,0.03)';
                t.style.borderColor = 'rgba(255,255,255,0.08)';
              }}
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
            color: recording ? '#e74c3c' : '#888', cursor: 'pointer', fontSize: 16, flexShrink: 0,
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Falar por voz (Chrome)"
        >
          {recording ? '\u25CF' : '\u{1F3A4}'}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder={sending ? 'Saori esta consultando o Alem...' : 'Pergunte algo aA Saori...'}
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
            color: sending || !input.trim() ? '#555' : '#fff',
            cursor: sending || !input.trim() ? 'default' : 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.2s',
          }}
        >
          {sending ? '...' : 'Enviar'}
        </button>
      </footer>
    </div>
  );
}

