'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, auth, isBackendError } from '@/lib/api';
import { B, IC, css } from '@/lib/dc';
import { useTheme } from '@/lib/theme';

import { Sidebar } from '@/components/chat/Sidebar';
import { MessageList } from '@/components/chat/MessageList';
import { WelcomeScreen } from '@/components/chat/WelcomeScreen';
import { SidebarSkeleton, HistorySkeleton } from '@/components/chat/SkeletonLoaders';
import { useKeyboardShortcuts } from '@/lib/shortcuts';
import type { ChatMessage, Conversation, AuthUser } from '@/lib/types';

const SUGGESTIONS = [
  'Investimento de mídia do Boticário no ciclo 04, por veículo',
  'Inserções da RD Atlântida FM em abril e maio',
  'Tabela de preços de TV para a RPC, 30 segundos',
  'PIs emitidos em Santa Catarina neste mês',
];

export default function ChatPage() {
  const router = useRouter();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const { light, toggle } = useTheme();
  const [client, setClient] = useState('O Boticário');
  const [clients, setClients] = useState<string[]>([]);
  const [backendDown, setBackendDown] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [chartView, setChartView] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);

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
    try {
      const r = await api.history(id);
      setMessages((r.messages || []).filter((m) => m.role !== 'system_summary') as ChatMessage[]);
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
    if (!msg || sending || backendDown) return;
    setInput('');

    let convId = activeId;
    const isNew = !convId;
    if (!convId) {
      convId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `conv_${Date.now()}`;
      setActiveId(convId);
      try { await api.createConversation(convId, msg.slice(0, 48)); } catch { /* segue */ }
    }

    const now = new Date().toISOString();
    const userMsg: ChatMessage = { message_id: `local_u_${Date.now()}`, conversation_id: convId, user_id: me?.email || 'me', role: 'user', content: msg, timestamp: now };
    setMessages((cur) => [...cur, userMsg]);
    setSending(true);
    api.saveMessage({ conversation_id: convId, role: 'user', content: msg }).catch(() => {});

    try {
      const r = await api.chat({ message: msg, conversation_id: convId, client });
      const bot: ChatMessage = { message_id: `local_a_${Date.now()}`, conversation_id: convId, user_id: 'athena', role: 'assistant', content: r.output || '', timestamp: new Date().toISOString(), sources: (r as any).sources || undefined, query: (r as any).query || undefined, attachment: r.attachment || undefined };
      setMessages((cur) => [...cur, bot]);
      api.saveMessage({ conversation_id: convId!, role: 'assistant', content: r.output || '' }).catch(() => {});
      if (isNew) loadConversations();
      // Compactação automática — evita perda de contexto (bug Victor)
      if (messages.length > 20) {
        api.compact(convId!).catch(() => {});
      }
    } catch (e: unknown) {
      if (isBackendError(e)) setBackendDown(true);
      setMessages((cur) => [...cur, { message_id: `err_${Date.now()}`, conversation_id: convId!, user_id: 'athena', role: 'assistant', content: isBackendError(e) ? 'Backend não conectado. Configure ATHENA_BACKEND_URL para conversar com dados reais.' : 'Não consegui consultar agora. Tente novamente.', timestamp: new Date().toISOString(), error: true }]);
    }
    setSending(false);
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
    // Remove the old assistant response
    setMessages(cur => cur.filter(m => m.message_id !== assistantMsg.message_id));
    // Re-send the original question
    await send(prevUser.content);
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
      />
      </div>

      <main style={css('flex:1; display:flex; flex-direction:column; min-width:0; background:var(--bg-deep); position:relative')}>

        {/* Hamburger (mobile only) */}
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} style={{ position: 'absolute', top: 14, left: 14, zIndex: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', color: 'var(--muted-light)', cursor: 'pointer', display: 'none', alignItems: 'center' }}>
          <IC s={18} d='<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>' w={2} />
        </button>

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
        <div style={css(`padding:14px 24px 22px; flex-shrink:0; display:${welcome ? 'none' : 'block'}`)}>
          <div style={css('max-width:760px; margin:0 auto')}>
            <div style={css('background:var(--bg-input); border:1px solid var(--red-dim); border-radius:14px; padding:12px 16px; box-shadow:0 0 0 3px rgba(196,30,30,.08)')}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                rows={1}
                disabled={backendDown}
                placeholder={backendDown ? 'Backend não conectado' : 'Pergunte sobre inserções, investimento, PIs ou tabelas de preço…'}
                style={css('width:100%; resize:none; min-height:26px; max-height:160px; background:transparent; border:none; outline:none; color:var(--white); font-family:var(--font-body); font-size:14.5px; line-height:1.6')}
              />
              <div style={css('display:flex; align-items:center; justify-content:flex-end; margin-top:8px; padding-top:8px; border-top:1px solid var(--border)')}>
                <B t="button" onClick={() => send(input)} c={`width:36px; height:36px; border:none; border-radius:9px; color:#fff; cursor:${input.trim() && !sending && !backendDown ? 'pointer' : 'default'}; display:flex; align-items:center; justify-content:center; background:${input.trim() && !sending && !backendDown ? 'var(--red)' : 'var(--border)'}`} h={input.trim() && !sending && !backendDown ? 'background:var(--red-dim); transform:translateY(-1px)' : ''}>
                  <IC s={18} d='<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>' w={2} />
                </B>
              </div>
            </div>
            <div style={css('text-align:center; font-size:11px; color:var(--muted); margin-top:10px')}>A Athena consulta bases licenciadas (Publi, Kantar). Confira sempre a fonte antes de usar em cliente.</div>
          </div>
        </div>
      </main>
    </div>
  );
}
