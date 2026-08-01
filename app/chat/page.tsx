'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, auth, isBackendError } from '@/lib/api';
import { B, IC, css } from '@/lib/dc';
import { useTheme } from '@/lib/theme';

import { Sidebar } from '@/components/chat/Sidebar';
import { MessageList } from '@/components/chat/MessageList';
import { WelcomeScreen } from '@/components/chat/WelcomeScreen';
import { SidebarSkeleton, HistorySkeleton } from '@/components/chat/SkeletonLoaders';
import { useKeyboardShortcuts } from '@/lib/shortcuts';
import { ContextBar } from '@/components/chat/ContextBar';
import { SaoriFloating } from '@/components/SaoriFloating';
import { SidebarNavigationSlim } from '@/components/application/app-navigation/sidebar-navigation/sidebar-slim';
import { navItems, footerItems } from '@/components/application/app-navigation/config';
import type { ChatMessage, Conversation, AuthUser } from '@/lib/types';

const SUGGESTIONS = [
  'Investimento de mídia do Boticário no ciclo 04, por veículo',
  'Inserções da RD Atlântida FM em abril e maio',
  'Tabela de preços de TV para a RPC, 30 segundos',
  'PIs emitidos em Santa Catarina neste mês',
  'Perfil de consumo de cosméticos no target mulheres AB 25+ (TGI)',
  'Audiência de TV top 10 programas Grande São Paulo (IBOPE)',
  'Tarefas abertas no ERP para O Boticário este mês',
  'Ranking de rádio por ouvintes/minuto em Curitiba',
];

export default function ChatPage() {
  const router = useRouter();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const { light, toggle } = useTheme();
  const [client, setClient] = useState('O Boticário');
  const [clients, setClients] = useState<string[]>([]);
  const [backendDown, setBackendDown] = useState(false);
  // A1: Contexto fixado (chips editáveis)
  const [contextChips, setContextChips] = useState<Record<string, string>>({
    ciclo: '', plano: '', periodo: '', meio: '',
  });

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [input, setInput] = useState('');
  // FIX B2: per-conversation sending state (não bloqueia global)
  const [sendingConvs, setSendingConvs] = useState<Record<string, boolean>>({});
  const sending = !!(activeId && sendingConvs[activeId]);
  const [search, setSearch] = useState('');
  const [chartView, setChartView] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // FIX B1: toast + pending messages for wrong-conversation responses
  const [toast, setToast] = useState<string | null>(null);
  const pendingMsgsRef = useRef<Record<string, ChatMessage[]>>({});
  // A3: AbortController per-conversa (parar geração)
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  // A2: notificações por conversa (badge "1 nova")
  const [convNotifs, setConvNotifs] = useState<Record<string, number>>({});
  // A4: Autocomplete de entidades
  const [acResults, setAcResults] = useState<{ name: string; type: string; label: string }[]>([]);
  const [acVisible, setAcVisible] = useState(false);
  const acTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(true);
  // Mic: gravação de áudio (Web Speech API)
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  // Upload de documentos (PDF/Excel/CSV)
  const [attachedFile, setAttachedFile] = useState<{ file: File; extractedText: string; filename: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // TTS: audio toggle + playback
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Auth gate
  useEffect(() => {
    (async () => {
      try {
        const m = await auth.me();
        if (!m?.authenticated) { router.replace('/login'); return; }
        setMe(m as AuthUser);
      } catch { router.replace('/login'); return; }
      setChecking(false);
    })();
  }, [router]);

  const loadConversations = useCallback(async () => {
    try {
      const r = await api.listConversations();
      setConversations(r.conversations || []);
      setBackendDown(false);
    } catch (e) {
      if (isBackendError(e)) setBackendDown(true);
    }
    setLoadingConvs(false);
  }, []);

  useEffect(() => { if (me) loadConversations(); }, [me, loadConversations]);

  // Buscar clientes do backend
  useEffect(() => {
    if (!me) return;
    api.listClients().then((r) => {
      if (r.clients && r.clients.length > 0) {
        setClients(r.clients);
        if (!r.clients.includes(client)) setClient(r.clients[0]);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  async function selectConversation(id: string) {
    setActiveId(id); setMessages([]); setLoadingHist(true);
    // A2: limpar badge de notificação ao abrir conversa
    setConvNotifs((prev) => { const next = { ...prev }; delete next[id]; return next; });
    try {
      const r = await api.history(id);
      let msgs = (r.messages || []).filter((m) => m.role !== 'system_summary') as ChatMessage[];
      // FIX B1: merge pending messages que chegaram enquanto estava em outra conversa
      if (pendingMsgsRef.current[id]) {
        const existingIds = new Set(msgs.map(m => m.message_id));
        const newPending = pendingMsgsRef.current[id].filter(m => !existingIds.has(m.message_id));
        if (newPending.length > 0) {
          msgs = [...msgs, ...newPending];
        }
        delete pendingMsgsRef.current[id];
      }
      setMessages(msgs);
    } catch (e) {
      if (isBackendError(e)) setBackendDown(true);
    }
    setLoadingHist(false);
  }

  function newConversation() {
    setActiveId(null); setMessages([]); setInput('');
  }

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || backendDown) return;
    setInput('');

    let convId = activeId;
    const isNew = !convId;
    if (!convId) {
      convId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `conv_${Date.now()}`;
      setActiveId(convId);
      try { await api.createConversation(convId, msg.slice(0, 48)); } catch { /* segue */ }
    }

    // FIX B2: per-conversation sending — não bloqueia global
    const sendingConvId = convId;
    setSendingConvs((prev) => ({ ...prev, [sendingConvId]: true }));

    const now = new Date().toISOString();
    const userMsg: ChatMessage = { message_id: `local_u_${Date.now()}`, conversation_id: convId, user_id: me?.email || 'me', role: 'user', content: msg, timestamp: now };
    setMessages((cur) => [...cur, userMsg]);
    // Persist user message — await para garantir que history() retorne essa msg ao trocar de conversa
    api.saveMessage({ conversation_id: convId, role: 'user', content: msg }).catch(() => {});
    // Guarda no pendingMsgsRef para merge ao voltar (bug Caroline: "Olá eu sou o Athena")
    pendingMsgsRef.current[convId] = [...(pendingMsgsRef.current[convId] || []), userMsg];

    // A3: criar AbortController para esta conversa
    const controller = new AbortController();
    abortControllersRef.current[sendingConvId] = controller;

    // A1: append contexto fixado à mensagem
    const ctxParts = Object.entries(contextChips).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
    let enrichedMsg = ctxParts.length > 0 ? `[Contexto: ${ctxParts.join(', ')}] ${msg}` : msg;

    // Inclui texto extraido do arquivo anexo como contexto
    if (attachedFile) {
      enrichedMsg = `[Documento anexado: ${attachedFile.filename}]\n\n${attachedFile.extractedText}\n\n---\nPergunta: ${enrichedMsg}`;
      setAttachedFile(null); // limpa após envio
    }

    try {
      // ── SSE Streaming: tokens em tempo real ──
      // TTS inline ainda usa o endpoint bloqueante /chat (precisa do audio base64).
      // Chat normal usa /chat/stream pra feedback visual instantâneo.
      if (ttsEnabled) {
        // Fallback: /chat bloqueante (retorna audio inline)
        const r = await api.chat({ message: enrichedMsg, conversation_id: convId, client, is_audio: true }, controller.signal);
        const bot: ChatMessage = { message_id: `local_a_${Date.now()}`, conversation_id: convId, user_id: 'athena', role: 'assistant', content: r.output || '', timestamp: new Date().toISOString(), sources: (r as any).sources || undefined, query: (r as any).query || undefined, attachment: r.attachment || undefined };
        setActiveId((currentActiveId) => {
          if (currentActiveId === sendingConvId) setMessages((cur) => [...cur, bot]);
          else {
            setToast(`Athena respondeu em outra conversa`);
            setTimeout(() => setToast(null), 4000);
            setConvNotifs((prev) => ({ ...prev, [sendingConvId]: (prev[sendingConvId] || 0) + 1 }));
            pendingMsgsRef.current[sendingConvId] = [...(pendingMsgsRef.current[sendingConvId] || []), bot];
          }
          return currentActiveId;
        });
        // TTS playback
        if (r.audio) {
          try {
            if (!audioContextRef.current) audioContextRef.current = new AudioContext();
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') await ctx.resume();
            const bin = atob(r.audio);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const buf = await ctx.decodeAudioData(bytes.buffer);
            try { sourceNodeRef.current?.stop(); sourceNodeRef.current?.disconnect(); } catch {}
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            sourceNodeRef.current = src;
            setIsPlaying(true);
            src.start();
            src.onended = () => { setIsPlaying(false); sourceNodeRef.current = null; };
          } catch (audioErr) { console.warn('TTS playback error:', audioErr); }
        }
        api.saveMessage({ conversation_id: convId!, role: 'assistant', content: r.output || '' }).catch(() => {});
      } else {
        // ── Streaming SSE: renderiza token a token ──
        const botMsgId = `local_a_${Date.now()}`;
        const streamBot: ChatMessage = { message_id: botMsgId, conversation_id: convId, user_id: 'athena', role: 'assistant', content: '', timestamp: new Date().toISOString() };

        // Insere placeholder vazio (vai preenchendo com tokens)
        setActiveId((currentActiveId) => {
          if (currentActiveId === sendingConvId) setMessages((cur) => [...cur, streamBot]);
          return currentActiveId;
        });

        await api.chatStream(
          { message: enrichedMsg, conversation_id: convId, client },
          controller.signal,
          {
            onToken: (token) => {
              // Atualiza a última mensagem (assistente) incrementalmente
              setMessages((cur) => {
                const last = cur[cur.length - 1];
                if (last?.message_id === botMsgId) {
                  return [...cur.slice(0, -1), { ...last, content: last.content + token }];
                }
                return cur;
              });
            },
            onToolStart: (name) => {
              // Mostra indicador de tool call
              setMessages((cur) => {
                const last = cur[cur.length - 1];
                if (last?.message_id === botMsgId) {
                  return [...cur.slice(0, -1), { ...last, toolStatus: `Consultando ${name}...` }];
                }
                return cur;
              });
            },
            onToolEnd: () => {
              // Remove indicador de tool call
              setMessages((cur) => {
                const last = cur[cur.length - 1];
                if (last?.message_id === botMsgId) {
                  const { toolStatus: _, ...rest } = last as any;
                  return [...cur.slice(0, -1), rest];
                }
                return cur;
              });
            },
            onDone: (fullText, latencyMs) => {
              // Salva mensagem completa no BigQuery
              api.saveMessage({ conversation_id: convId!, role: 'assistant', content: fullText }).catch(() => {});
              // Notifica se mudou de conversa enquanto gerava
              setActiveId((currentActiveId) => {
                if (currentActiveId !== sendingConvId) {
                  setToast(`Athena respondeu em outra conversa`);
                  setTimeout(() => setToast(null), 4000);
                  setConvNotifs((prev) => ({ ...prev, [sendingConvId]: (prev[sendingConvId] || 0) + 1 }));
                  const finalBot: ChatMessage = { ...streamBot, content: fullText };
                  pendingMsgsRef.current[sendingConvId] = [...(pendingMsgsRef.current[sendingConvId] || []), finalBot];
                }
                return currentActiveId;
              });
            },
            onError: (errMsg) => {
              setMessages((cur) => {
                const last = cur[cur.length - 1];
                if (last?.message_id === botMsgId) {
                  return [...cur.slice(0, -1), { ...last, content: errMsg || 'Erro ao processar.', error: true }];
                }
                return cur;
              });
            },
          },
        );
      }

      if (isNew) loadConversations();
      // Compactação automática — evita perda de contexto (bug Victor)
      if (messages.length > 20) {
        api.compact(convId!).catch(() => {});
      }
    } catch (e: unknown) {
      if (isBackendError(e)) setBackendDown(true);
      const errMsg: ChatMessage = { message_id: `err_${Date.now()}`, conversation_id: convId!, user_id: 'athena', role: 'assistant', content: isBackendError(e) ? 'Backend não conectado. Configure ATHENA_BACKEND_URL para conversar com dados reais.' : 'Não consegui consultar agora. Tente novamente.', timestamp: new Date().toISOString(), error: true };
      setActiveId((currentActiveId) => {
        if (currentActiveId === sendingConvId) {
          setMessages((cur) => [...cur, errMsg]);
        }
        return currentActiveId;
      });
    }
    delete abortControllersRef.current[sendingConvId];
    setSendingConvs((prev) => { const next = { ...prev }; delete next[sendingConvId]; return next; });
  }

  // A3: Parar geração
  function stopGeneration() {
    if (activeId && abortControllersRef.current[activeId]) {
      abortControllersRef.current[activeId].abort();
      delete abortControllersRef.current[activeId];
      setSendingConvs((prev) => { const next = { ...prev }; if (activeId) delete next[activeId]; return next; });
    }
  }

  async function sendFeedback(m: ChatMessage, rating: 'positive' | 'negative', comment?: string) {
    const prev = messages.find((x) => x.role === 'user' && messages.indexOf(x) < messages.indexOf(m));
    setMessages((cur) => cur.map((x) => (x.message_id === m.message_id ? { ...x, fb: rating } : x)));
    try {
      await api.feedback({ message_id: m.message_id, rating, conversation_id: m.conversation_id, user_query: prev?.content, assistant_response: m.content, comment });
    } catch { /* silencioso */ }
  }

  async function regenerate(assistantMsg: ChatMessage) {
    if (sending) return;
    // Find the user message that preceded this assistant response
    const idx = messages.findIndex(x => x.message_id === assistantMsg.message_id);
    const prevUser = [...messages].slice(0, idx).reverse().find(m => m.role === 'user');
    if (!prevUser) return;
    const originalText = prevUser.content;
    // Remove BOTH the old user message AND the old assistant response
    // (send() will re-create the user message, avoiding duplicates)
    setMessages(cur => cur.filter(m => m.message_id !== assistantMsg.message_id && m.message_id !== prevUser.message_id));
    // Re-send the original question
    await send(originalText);
  }


  async function logout() { try { await auth.logout(); } catch {} router.replace('/login'); }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewConversation: () => { newConversation(); setSidebarOpen(false); },
    onToggleSidebar: () => setSidebarOpen((v) => !v),
    onFocusSearch: () => {
      const el = document.querySelector<HTMLInputElement>('[data-search-input]');
      el?.focus();
    },
  });


  if (checking) {
    return (
      <div style={css('display:flex; height:100vh; background:var(--bg-deep); overflow:hidden')}>
        {/* Sidebar skeleton */}
        <div style={css('width:var(--sidebar-w); flex-shrink:0; padding:20px 16px; border-right:1px solid var(--border-faint); background:rgba(24,24,27,0.65)')}>  
          <SidebarSkeleton count={6} />
        </div>
        {/* Main area skeleton */}
        <div style={css('flex:1; padding:28px 24px; display:flex; flex-direction:column; gap:28px; max-width:760px; margin:0 auto')}>
          <HistorySkeleton count={3} />
        </div>
      </div>
    );
  }

  const active = conversations.find((c) => c.conversation_id === activeId);
  const activeTitle = active?.title || (activeId ? 'Conversa' : 'Nova conversa');
  const welcome = !activeId && messages.length === 0;

  return (
    <div style={css('display:flex; height:100vh; min-height:640px; background:var(--bg-deep); color:var(--white); font-family:var(--font-body); overflow:hidden')}>

      {/* Sidebar de navegação slim (ícones) */}
      <SidebarNavigationSlim items={navItems} footerItems={footerItems} />

      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className={sidebarOpen ? 'sidebar-mobile-open' : 'sidebar-mobile-hidden'}>
      <Sidebar
        me={me}
        conversations={conversations}
        activeId={activeId}
        search={search}
        onSearchChange={setSearch}
        loading={loadingConvs}
        client={client}
        clients={clients}
        onClientChange={setClient}
        onSelectConversation={(id) => { selectConversation(id); setSidebarOpen(false); }}
        onNewConversation={() => { newConversation(); setSidebarOpen(false); }}
        onLogout={logout}
        backendDown={backendDown}
        light={light}
        onToggleTheme={toggle}
        onRenameConversation={(id, title) => {
          setConversations((cur) => cur.map((c) => (c.conversation_id === id ? { ...c, title } : c)));
          api.renameConversation(id, title).catch(() => {});
        }}
        onDeleteConversation={(id) => {
          setConversations((cur) => cur.filter((c) => c.conversation_id !== id));
          if (activeId === id) { setActiveId(null); setMessages([]); }
          api.deleteConversation(id).catch(() => {});
        }}
        onPinConversation={(id) => {
          setConversations((cur) => {
            const updated = cur.map((c) => c.conversation_id === id ? { ...c, pinned: !c.pinned } : c);
            // Persist pins in localStorage
            const pins = updated.filter(c => c.pinned).map(c => c.conversation_id);
            try { localStorage.setItem('athena_pinned', JSON.stringify(pins)); } catch {}
            return updated;
          });
        }}
        onDuplicateConversation={(id) => {
          const orig = conversations.find(c => c.conversation_id === id);
          if (!orig) return;
          const newId = `dup_${Date.now()}`;
          const dup: Conversation = { ...orig, conversation_id: newId, title: `${orig.title} (cópia)`, pinned: false };
          setConversations((cur) => [dup, ...cur]);
          selectConversation(newId);
        }}
        sendingConvs={sendingConvs}
        convNotifs={convNotifs}
      />
      </div>

      <main style={css('flex:1; display:flex; flex-direction:column; min-width:0; background:var(--bg-deep); position:relative')}>

        {/* Hamburger (mobile only) */}
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} style={{ position: 'absolute', top: 14, left: 14, zIndex: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', color: 'var(--muted-light)', cursor: 'pointer', display: 'none', alignItems: 'center' }}>
          <IC s={18} d='<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>' w={2} />
        </button>

        {/* A1: Barra de contexto fixado */}
        {!welcome && (
          <ContextBar
            chips={[
              { key: 'ciclo', label: 'Ciclo', value: contextChips.ciclo },
              { key: 'plano', label: 'Plano', value: contextChips.plano },
              { key: 'periodo', label: 'Período', value: contextChips.periodo },
              { key: 'meio', label: 'Meio', value: contextChips.meio, options: ['TV', 'Rádio', 'Digital', 'OOH', 'Jornal', 'Revista'] },
            ]}
            onChipChange={(key, val) => setContextChips(prev => ({ ...prev, [key]: val }))}
            onClearAll={() => setContextChips({ ciclo: '', plano: '', periodo: '', meio: '' })}
          />
        )}

        {backendDown && (
          <div style={css('flex-shrink:0; display:flex; align-items:center; gap:11px; padding:10px 24px; background:rgba(201,162,39,.08); border-bottom:1px solid rgba(201,162,39,.25)')}>
            <IC s={15} d='<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' stroke="var(--gold)" />
            <span style={css('font-size:12.5px; color:var(--white)')}>Backend não conectado.</span>
            <span style={css('font-size:12px; color:var(--muted)')}>Defina ATHENA_BACKEND_URL e ATHENA_BACKEND_TOKEN no servidor. Nada aqui é exibido com dados fictícios.</span>
          </div>
        )}

        {welcome ? (
          <div style={css('flex:1; overflow-y:auto; padding:28px 24px 8px')}>
            <WelcomeScreen
              userName={(me?.name || '').split(' ')[0]}
              onSend={send}
              suggestions={SUGGESTIONS}
              backendDown={backendDown}
            />
          </div>
        ) : (
          <MessageList
            messages={messages}
            me={me}
            sending={sending}
            loadingHist={loadingHist}
            onSendFeedback={sendFeedback}
            onRegenerate={regenerate}
            chartView={chartView}
            onToggleChart={(id) => setChartView((s) => ({ ...s, [id]: !s[id] }))}
          />
        )}

        {/* Composer */}
        <div style={css(`padding:10px 24px 18px; flex-shrink:0; display:${welcome ? 'none' : 'block'}`)}>
          <div style={css('max-width:760px; margin:0 auto')}>
            <div style={css(`background:var(--bg-input); border:1px solid ${sending ? 'var(--red-dim)' : 'var(--border)'}; border-radius:14px; padding:12px 16px; ${sending ? 'box-shadow:0 0 0 3px rgba(196,30,30,.08)' : 'box-shadow:none'}; position:relative; transition:border-color .2s, box-shadow .2s`)}>
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // A4: debounced autocomplete
                  const val = e.target.value;
                  if (acTimerRef.current) clearTimeout(acTimerRef.current);
                  const lastWord = val.split(/\s+/).pop() || '';
                  if (lastWord.length >= 2) {
                    acTimerRef.current = setTimeout(async () => {
                      try {
                        const r = await api.searchEntities(lastWord);
                        setAcResults(r.results || []);
                        setAcVisible((r.results || []).length > 0);
                      } catch { setAcVisible(false); }
                    }, 300);
                  } else { setAcVisible(false); }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setAcVisible(false); return; }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setAcVisible(false); send(input); }
                }}
                rows={1}
                disabled={backendDown}
                placeholder={backendDown ? 'Backend não conectado' : 'Pergunte sobre investimento, PIs, audiência, TGI, tarefas ou tabelas de preço…'}
                style={css('width:100%; resize:none; min-height:26px; max-height:160px; background:transparent; border:none; outline:none; color:var(--white); font-family:var(--font-body); font-size:14.5px; line-height:1.6')}
              />
              {/* A4: Autocomplete dropdown */}
              {acVisible && acResults.length > 0 && (
                <div style={css('position:absolute; bottom:100%; left:0; right:0; max-height:200px; overflow-y:auto; background:var(--bg-card); border:1px solid var(--border); border-radius:10px; margin-bottom:6px; box-shadow:var(--shadow-lg); z-index:20')}>
                  {acResults.map((r, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        const words = input.split(/\s+/);
                        words[words.length - 1] = r.name;
                        setInput(words.join(' ') + ' ');
                        setAcVisible(false);
                      }}
                      style={css('padding:8px 14px; cursor:pointer; font-size:13px; display:flex; align-items:center; gap:10px; transition:background .15s')}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={css('font-size:9.5px; padding:2px 7px; border-radius:5px; background:var(--bg-surface); color:var(--fg-3); font-weight:600; letter-spacing:.03em; text-transform:uppercase; flex-shrink:0')}>{r.label}</span>
                      <span style={css('color:var(--white); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap')}>{r.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Indicador de arquivo anexado */}
              {attachedFile && (
                <div style={css('display:flex; align-items:center; gap:8px; margin-top:8px; padding:8px 12px; background:rgba(63,185,80,.06); border:1px solid rgba(63,185,80,.2); border-radius:8px; font-size:12px; color:var(--green)')}>
                  <IC s={14} d='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' stroke="var(--green)" />
                  <span style={css('flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap')}>{attachedFile.filename}</span>
                  <button onClick={() => setAttachedFile(null)} style={css('background:none; border:none; color:var(--muted); cursor:pointer; padding:2px; display:flex')}>
                    <IC s={14} d='<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' w={2} />
                  </button>
                </div>
              )}
              {uploading && (
                <div style={css('display:flex; align-items:center; gap:8px; margin-top:8px; padding:8px 12px; background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; font-size:12px; color:var(--muted-light)')}>
                  <span style={css('width:14px; height:14px; border:2px solid var(--border); border-top-color:var(--red); border-radius:50%; animation:spin 0.8s linear infinite; flex-shrink:0')} />
                  Processando documento...
                </div>
              )}
              {/* File input hidden */}
              <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.csv" style={{ display: 'none' }} onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                e.target.value = ''; // reset para permitir re-upload do mesmo arquivo
                setUploading(true);
                try {
                  const result = await api.upload(f);
                  setAttachedFile({ file: f, extractedText: result.text, filename: result.filename });
                  setToast(`Documento processado: ${result.filename}`);
                  setTimeout(() => setToast(null), 3000);
                } catch (err: any) {
                  setToast(`Erro ao processar: ${err.message || 'falha no upload'}`);
                  setTimeout(() => setToast(null), 4000);
                }
                setUploading(false);
              }} />
              <div style={css('display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-top:8px; padding-top:8px; border-top:1px solid var(--border)')}>
                {/* TTS toggle */}
                <B t="button" onClick={() => { setTtsEnabled(!ttsEnabled); if (isPlaying) { try { sourceNodeRef.current?.stop(); sourceNodeRef.current?.disconnect(); } catch {} setIsPlaying(false); sourceNodeRef.current = null; } }} c={`width:36px; height:36px; border:1px solid ${ttsEnabled ? 'var(--red-dim)' : 'var(--border)'}; border-radius:9px; color:${ttsEnabled ? 'var(--red)' : 'var(--muted)'}; cursor:pointer; display:flex; align-items:center; justify-content:center; background:${ttsEnabled ? 'rgba(196,30,30,.08)' : 'transparent'}; transition:all .2s`} h="border-color:var(--red-dim); color:var(--white)" title={ttsEnabled ? 'Desativar voz (TTS)' : 'Ativar voz (TTS)'}>
                  <IC s={16} d={ttsEnabled ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'} w={1.8} />
                </B>
                {/* Stop audio button */}
                {isPlaying && (
                  <B t="button" onClick={() => { try { sourceNodeRef.current?.stop(); sourceNodeRef.current?.disconnect(); } catch {} setIsPlaying(false); sourceNodeRef.current = null; }} c="width:36px; height:36px; border:1px solid var(--red-dim); border-radius:9px; color:var(--red); cursor:pointer; display:flex; align-items:center; justify-content:center; background:rgba(196,30,30,.08); transition:all .2s; animation:pulse 1.5s infinite" h="background:rgba(196,30,30,.15)" title="Parar audio">
                    <IC s={14} d='<rect x="6" y="6" width="12" height="12" rx="2"/>' stroke="var(--red)" w={2} />
                  </B>
                )}
                {/* Attach button */}
                <B t="button" onClick={() => fileInputRef.current?.click()} c="width:36px; height:36px; border:1px solid var(--border); border-radius:9px; color:var(--muted-light); cursor:pointer; display:flex; align-items:center; justify-content:center; background:transparent; transition:all .2s" h="border-color:var(--red-dim); color:var(--white)" title="Anexar documento (PDF, Excel, CSV)">
                  <IC s={16} d='<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>' w={1.8} />
                </B>
                {/* Mic button — Web Speech API */}
                <B t="button" onClick={() => {
                  if (recording) {
                    recognitionRef.current?.stop();
                    setRecording(false);
                    return;
                  }
                  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  if (!SR) { setToast('Seu navegador não suporta gravação de voz'); setTimeout(() => setToast(null), 3000); return; }
                  const rec = new SR();
                  rec.lang = 'pt-BR';
                  rec.interimResults = false;
                  rec.maxAlternatives = 1;
                  rec.onresult = (e: any) => {
                    const txt = e.results[0][0].transcript;
                    setInput((prev) => (prev ? prev + ' ' : '') + txt);
                    setRecording(false);
                  };
                  rec.onerror = () => setRecording(false);
                  rec.onend = () => setRecording(false);
                  recognitionRef.current = rec;
                  rec.start();
                  setRecording(true);
                }} c={`width:36px; height:36px; border:1px solid ${recording ? 'var(--red)' : 'var(--border)'}; border-radius:9px; color:${recording ? 'var(--red)' : 'var(--muted-light)'}; cursor:pointer; display:flex; align-items:center; justify-content:center; background:${recording ? 'rgba(196,30,30,.1)' : 'transparent'}; transition:all .2s; ${recording ? 'animation:pulse 1.5s infinite' : ''}`} h={recording ? '' : 'border-color:var(--red-dim); color:var(--white)'} title={recording ? 'Parar gravação' : 'Perguntar por voz'}>
                  <IC s={16} d='<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>' w={1.8} />
                </B>
                {/* A3: Botão Parar geração */}
                {sending && (
                  <B t="button" onClick={stopGeneration} c="height:36px; padding:0 14px; border:1px solid var(--red-dim); border-radius:9px; color:var(--red); cursor:pointer; display:flex; align-items:center; gap:6px; background:transparent; font-size:12.5px; font-weight:600; font-family:var(--font-body)" h="background:rgba(196,30,30,.1)">
                    <IC s={14} d='<rect x="6" y="6" width="12" height="12" rx="2"/>' stroke="var(--red)" w={2} />
                    Parar
                  </B>
                )}
                <B t="button" onClick={() => send(input)} c={`width:36px; height:36px; border:none; border-radius:9px; color:#fff; cursor:${input.trim() && !sending && !backendDown ? 'pointer' : 'default'}; display:flex; align-items:center; justify-content:center; background:${input.trim() && !sending && !backendDown ? 'var(--red)' : 'var(--border)'}`} h={input.trim() && !sending && !backendDown ? 'background:var(--red-dim); transform:translateY(-1px)' : ''}>
                  <IC s={18} d='<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>' w={2} />
                </B>
              </div>
            </div>
            <div style={css('text-align:center; font-size:11px; color:var(--muted); margin-top:10px')}>A Athena consulta bases licenciadas (Publi, Kantar). Confira sempre a fonte antes de usar em cliente.</div>
          </div>
        </div>
      </main>

      {/* Saori — assistente flutuante */}
      <SaoriFloating />

      {/* FIX B1: Toast notification */}
      {toast && (
        <div style={css('position:fixed; bottom:24px; right:24px; z-index:9999; padding:12px 20px; background:var(--bg-card); border:1px solid var(--border); border-radius:12px; box-shadow:var(--shadow-lg); font-size:13px; color:var(--white); animation:fadeIn 0.3s ease;')}>
          {toast}
        </div>
      )}
    </div>
  );
}
