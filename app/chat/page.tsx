'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, auth, isBackendError, type Conversation, type Msg } from '@/lib/api';
import { B, IC, css } from '@/lib/dc';
import { Markdown } from '@/components/Markdown';
import { AnimatedComposer } from '@/components/AnimatedComposer';
import { relativeTime, initials } from '@/lib/format';

const ic = (s: number, d: string, w = 1.8) => <IC s={s} d={d} w={w} />;

type ChatMsg = Msg & { pending?: boolean; error?: boolean; attachment?: any; fb?: 'positive' | 'negative'; sources?: { label: string; detail?: string }[]; query?: string };

const SUGGESTIONS = [
  'Investimento de mídia do Boticário no ciclo 04, por veículo',
  'Inserções da RD Atlântida FM em abril e maio',
  'Tabela de preços de TV para a RPC, 30 segundos',
  'PIs emitidos em Santa Catarina neste mês',
];

export default function ChatPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [light, setLight] = useState(false);
  const [client, setClient] = useState('O Boticário');
  const [backendDown, setBackendDown] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const [fbOpen, setFbOpen] = useState<string | null>(null);
  const [fbComment, setFbComment] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.documentElement.classList.toggle('light', light); }, [light]);

  // auth gate
  useEffect(() => {
    (async () => {
      try {
        const m = await auth.me();
        if (!m?.authenticated) { router.replace('/login'); return; }
        setMe(m);
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
  }, []);

  useEffect(() => { if (me) loadConversations(); }, [me, loadConversations]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loadingHist]);

  async function selectConversation(id: string) {
    setActiveId(id); setMessages([]); setLoadingHist(true); setRenaming(false);
    try {
      const r = await api.history(id);
      setMessages((r.messages || []).filter((m) => m.role !== 'system_summary'));
    } catch (e) {
      if (isBackendError(e)) setBackendDown(true);
    }
    setLoadingHist(false);
  }

  function newConversation() {
    setActiveId(null); setMessages([]); setInput(''); setRenaming(false);
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
    const userMsg: ChatMsg = { message_id: `local_u_${Date.now()}`, conversation_id: convId, user_id: me?.email || 'me', role: 'user', content: msg, timestamp: now };
    setMessages((cur) => [...cur, userMsg]);
    setSending(true);
    api.saveMessage({ conversation_id: convId, role: 'user', content: msg }).catch(() => {});

    try {
      const r = await api.chat({ message: msg, conversation_id: convId, client });
      const bot: ChatMsg = { message_id: `local_a_${Date.now()}`, conversation_id: convId, user_id: 'athena', role: 'assistant', content: r.output || '', timestamp: new Date().toISOString(), sources: (r as any).sources || undefined, query: (r as any).query || undefined, attachment: r.attachment || undefined };
      setMessages((cur) => [...cur, bot]);
      api.saveMessage({ conversation_id: convId!, role: 'assistant', content: r.output || '' }).catch(() => {});
      if (isNew) loadConversations();
    } catch (e: any) {
      if (isBackendError(e)) setBackendDown(true);
      setMessages((cur) => [...cur, { message_id: `err_${Date.now()}`, conversation_id: convId!, user_id: 'athena', role: 'assistant', content: isBackendError(e) ? 'Backend não conectado. Configure ATHENA_BACKEND_URL para conversar com dados reais.' : 'Não consegui consultar agora. Tente novamente.', timestamp: new Date().toISOString(), error: true }]);
    }
    setSending(false);
  }

  async function sendFeedback(m: ChatMsg, rating: 'positive' | 'negative', comment?: string) {
    const prev = messages.find((x) => x.role === 'user' && messages.indexOf(x) < messages.indexOf(m));
    setMessages((cur) => cur.map((x) => (x.message_id === m.message_id ? { ...x, fb: rating } : x)));
    setFbOpen(null); setFbComment('');
    try {
      await api.feedback({ message_id: m.message_id, rating, conversation_id: m.conversation_id, user_query: prev?.content, assistant_response: m.content, comment });
    } catch { /* silencioso */ }
  }

  async function playTts(text: string) {
    try {
      const r = await api.tts(text.slice(0, 4000));
      if (r?.audio) new Audio(`data:audio/mp3;base64,${r.audio}`).play().catch(() => {});
    } catch { /* silencioso */ }
  }

  async function doRename() {
    if (!activeId || !renameVal.trim()) { setRenaming(false); return; }
    const title = renameVal.trim();
    setConversations((cur) => cur.map((c) => (c.conversation_id === activeId ? { ...c, title } : c)));
    setRenaming(false);
    try { await api.renameConversation(activeId, title); } catch { /* segue */ }
  }

  async function logout() { try { await auth.logout(); } catch {} router.replace('/login'); }

  if (checking) {
    return <div style={css('display:flex; height:100vh; align-items:center; justify-content:center; background:var(--bg-deep); color:var(--muted); font-family:\'Open Sans\',sans-serif; font-size:14px')}>Carregando…</div>;
  }

  const active = conversations.find((c) => c.conversation_id === activeId);
  const activeTitle = active?.title || (activeId ? 'Conversa' : 'Nova conversa');
  const filtered = search ? conversations.filter((c) => (c.title || '').toLowerCase().includes(search.toLowerCase())) : conversations;
  const welcome = !activeId && messages.length === 0;
  const themeIcon = light ? ic(14, '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>', 2) : ic(15, '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>', 2);

  return (
    <div style={css('display:flex; height:100vh; min-height:640px; background:var(--bg-deep); color:var(--white); font-family:\'Open Sans\',sans-serif; overflow:hidden')}>
      {/* SIDEBAR */}
      <aside style={css('width:var(--sidebar-w); flex-shrink:0; background:var(--bg-surface); display:flex; flex-direction:column')}>
        <div style={css('height:60px; flex-shrink:0; padding:0 16px; display:flex; align-items:center; gap:11px')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/athena-logo.png" alt="Athena" style={css('width:40px; height:40px; object-fit:contain; flex-shrink:0')} />
          <div style={css('min-width:0')}>
            <div style={css('font-family:\'Montserrat\',sans-serif; font-size:17px; font-weight:700; letter-spacing:2.5px; line-height:1.05')}>ATHENA</div>
            <div style={css('font-size:9px; letter-spacing:1.8px; color:var(--red); font-weight:700; margin-top:2px')}>OPUSMÚLTIPLA</div>
          </div>
        </div>

        <div style={css('padding:12px 16px 10px; display:flex; flex-direction:column; gap:10px')}>
          <div style={css('display:flex; align-items:center; gap:8px; padding:8px 11px; background:var(--bg-panel); border:1px solid var(--border); border-radius:8px')}>
            <span style={css('font-size:9px; letter-spacing:1.3px; text-transform:uppercase; color:var(--muted); font-weight:600; flex-shrink:0')}>Cliente</span>
            <select value={client} onChange={(e) => setClient(e.target.value)} style={css('flex:1; min-width:0; background:transparent; border:none; outline:none; color:var(--white); font-family:\'Open Sans\',sans-serif; font-size:12.5px; cursor:pointer')}>
              <option style={{ color: '#000' }}>O Boticário</option>
              <option style={{ color: '#000' }}>Eudora</option>
              <option style={{ color: '#000' }}>Quem disse, Berenice?</option>
              <option style={{ color: '#000' }}>Todos</option>
            </select>
          </div>
          <B t="button" onClick={newConversation} c="padding:10px 14px; background:rgba(196,30,30,.1); border:1px solid var(--red-dim); border-radius:8px; color:var(--white); font-family:'Open Sans',sans-serif; font-size:13px; font-weight:500; cursor:pointer; display:flex; align-items:center; gap:8px" h="background:rgba(196,30,30,.18); border-color:var(--red)">
            <span style={css('font-size:15px; line-height:1')}>+</span> Nova conversa
          </B>
          <div style={css('display:flex; align-items:center; gap:8px; padding:8px 12px; background:var(--bg-input); border:1px solid var(--border); border-radius:8px')}>
            <IC s={13} d='<circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.5" y2="16.5"/>' stroke="var(--muted)" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conversas" style={css('flex:1; min-width:0; background:transparent; border:none; outline:none; color:var(--white); font-family:\'Open Sans\',sans-serif; font-size:12.5px')} />
          </div>
        </div>

        <div style={css('flex:1; overflow-y:auto; padding:4px 8px 12px')}>
          {backendDown ? (
            <div style={css('padding:14px 12px; font-size:12px; color:var(--muted); line-height:1.6')}>Sem conexão com o backend. As conversas reais aparecem aqui quando <code style={{ fontFamily: 'monospace' }}>ATHENA_BACKEND_URL</code> estiver configurada.</div>
          ) : filtered.length === 0 ? (
            <div style={css('padding:14px 12px; font-size:12px; color:var(--muted); line-height:1.6')}>{search ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa ainda. Clique em “Nova conversa”.'}</div>
          ) : (
            filtered.map((c) => {
              const on = c.conversation_id === activeId;
              return (
                <B key={c.conversation_id} onClick={() => selectConversation(c.conversation_id)} c={`padding:9px 11px; border-radius:7px; font-size:13px; cursor:pointer; margin-bottom:2px; border:1px solid ${on ? 'var(--border)' : 'transparent'}; background:${on ? 'var(--bg-panel)' : 'transparent'}; display:flex; align-items:center; gap:9px`} h="background:var(--bg-panel)">
                  <span style={css('flex:1; min-width:0')}>
                    <span style={css(`display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:${on ? 'var(--white)' : 'var(--muted-light)'}`)}>{c.title || 'Sem título'}</span>
                    <span style={css('display:flex; gap:8px; margin-top:3px; font-size:10.5px; color:var(--muted-dim)')}>
                      <span>{relativeTime(c.updated_at)}</span>
                      {c.message_count > 0 && <span>· {c.message_count} msg</span>}
                    </span>
                  </span>
                </B>
              );
            })
          )}
        </div>

        {me?.admin && (
          <div style={css('padding:12px 16px; border-top:1px solid var(--border)')}>
            <B t="a" href="/admin" c="padding:10px 14px; background:transparent; border:1px dashed var(--border); border-radius:8px; color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.5px; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px" h="border-color:var(--red-dim); color:var(--white); background:rgba(196,30,30,.06)">
              <IC s={13} d='<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' w={2} /> Painel de Auditoria
            </B>
          </div>
        )}
        <div style={css('padding:10px 20px 6px; text-align:center')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/opus-multipla-logo.png" alt="OpusMultipla" style={css('max-width:104px; height:auto; opacity:.35; filter:grayscale(.3)')} />
        </div>
        <div style={css('padding:12px 16px; border-top:1px solid var(--border); display:flex; align-items:center; gap:10px')}>
          <div style={css('width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,var(--red-dim),var(--red)); display:flex; align-items:center; justify-content:center; font-family:\'Montserrat\',sans-serif; font-size:12px; font-weight:600; color:var(--white); flex-shrink:0')}>{initials(me?.name || me?.email)}</div>
          <div style={css('flex:1; min-width:0')}>
            <div style={css('font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{me?.name || 'Usuário'}</div>
            <div style={css('font-size:10px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{me?.email}</div>
          </div>
          <B t="button" onClick={logout} title="Sair" c="background:none; border:none; color:var(--muted); cursor:pointer; padding:4px; display:flex; flex-shrink:0" h="color:var(--red)">
            <IC s={14} d='<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>' />
          </B>
        </div>
      </aside>

      {/* MAIN */}
      <main style={css('flex:1; display:flex; flex-direction:column; min-width:0; background:var(--bg-deep); position:relative')}>
        <div style={css('height:60px; flex-shrink:0; padding:0 20px 0 24px; display:flex; align-items:center; gap:12px; background:var(--bg-surface); box-shadow:0 6px 18px -8px rgba(0,0,0,.75); z-index:3')}>
          <div style={css('flex:1; min-width:0; display:flex; align-items:center; gap:9px')}>
            {renaming ? (
              <>
                <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doRename(); if (e.key === 'Escape') setRenaming(false); }} style={css('flex:1; min-width:0; max-width:420px; padding:6px 10px; background:var(--bg-input); border:1px solid var(--red-dim); border-radius:7px; outline:none; color:var(--white); font-family:\'Open Sans\',sans-serif; font-size:14px; font-weight:600')} />
                <B t="button" onClick={doRename} c="padding:6px 12px; border:none; border-radius:7px; background:var(--red); color:#fff; font-family:'Open Sans',sans-serif; font-size:11.5px; font-weight:600; cursor:pointer; flex-shrink:0" h="background:var(--red-dim)">Salvar</B>
              </>
            ) : (
              <>
                <span style={css('font-size:14px; font-weight:600; color:var(--white); white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{activeTitle}</span>
                {activeId && (
                  <B t="button" onClick={() => { setRenameVal(active?.title || ''); setRenaming(true); }} title="Renomear" c="background:none; border:none; padding:4px; border-radius:5px; color:var(--muted-dim); cursor:pointer; display:flex; flex-shrink:0" h="color:var(--white); background:var(--bg-panel)">
                    <IC s={13} d='<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>' />
                  </B>
                )}
              </>
            )}
          </div>
          <B t="button" onClick={() => setLight((v) => !v)} title={light ? 'Tema escuro' : 'Tema claro'} c="width:32px; height:32px; background:transparent; border:1px solid var(--border); border-radius:8px; color:var(--muted); cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0" h="border-color:var(--red-dim); color:var(--white)">{themeIcon}</B>
        </div>

        {backendDown && (
          <div style={css('flex-shrink:0; display:flex; align-items:center; gap:11px; padding:10px 24px; background:rgba(201,162,39,.08); border-bottom:1px solid rgba(201,162,39,.25)')}>
            <IC s={15} d='<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' stroke="var(--gold)" />
            <span style={css('font-size:12.5px; color:var(--white)')}>Backend não conectado.</span>
            <span style={css('font-size:12px; color:var(--muted)')}>Defina ATHENA_BACKEND_URL e ATHENA_BACKEND_TOKEN no servidor. Nada aqui é exibido com dados fictícios.</span>
          </div>
        )}

        <div ref={scrollRef} style={css('flex:1; overflow-y:auto; overflow-x:hidden; padding:28px 24px 8px')}>
          {welcome ? (
            <div style={css('max-width:720px; margin:0 auto; display:flex; flex-direction:column; align-items:center; padding-top:6vh')}>
              <div style={css('position:relative; margin-bottom:20px')}>
                <div style={{ ...css('position:absolute; inset:-40px; border-radius:50%; background:radial-gradient(circle, rgba(196,30,30,0.16), transparent 70%); pointerEvents:none'), animation: 'auraGlow 4s ease-in-out infinite' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/athena-logo.png" alt="Athena" style={css('position:relative; width:88px; height:auto')} />
              </div>
              <div style={css('font-family:\'Montserrat\',sans-serif; font-size:26px; font-weight:700; letter-spacing:2px; text-align:center')}>Olá, {(me?.name || '').split(' ')[0] || 'bem-vindo'}</div>
              <div style={css('font-size:14px; color:var(--muted-light); margin-top:12px; text-align:center; max-width:460px; line-height:1.7; text-wrap:pretty')}>Pergunte sobre investimento, inserções, PIs, audiência ou tabelas de preço. Consulto o Publi e as bases Kantar, nunca a web aberta.</div>
              <div style={css('width:100%; margin-top:24px')}>
                <AnimatedComposer onSend={send} prompts={SUGGESTIONS} disabled={backendDown} />
              </div>
            </div>
          ) : (
            <div style={css('max-width:760px; margin:0 auto; display:flex; flex-direction:column; gap:22px')}>
              {loadingHist && <div style={css('text-align:center; font-size:12px; color:var(--muted); padding:20px')}>Carregando histórico…</div>}
              {messages.map((m) => (m.role === 'user' ? (
                <div key={m.message_id} style={css('display:flex; flex-direction:row-reverse; gap:14px; align-items:flex-start')}>
                  <div style={css('width:34px; height:34px; border-radius:50%; flex-shrink:0; margin-top:2px; background:linear-gradient(135deg,var(--red-dim),var(--red)); display:flex; align-items:center; justify-content:center; font-family:\'Montserrat\',sans-serif; font-size:12px; font-weight:700')}>{initials(me?.name || me?.email)}</div>
                  <div style={css('flex:1; min-width:0; display:flex; flex-direction:column; align-items:flex-end')}>
                    <div style={css('font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--muted); margin-bottom:6px')}>Você</div>
                    <div style={css('display:inline-block; max-width:100%; background:var(--user-bubble); border:1px solid var(--border-subtle); border-radius:12px 4px 12px 12px; padding:12px 15px; font-size:14.5px; line-height:1.7; white-space:pre-wrap')}>{m.content}</div>
                  </div>
                </div>
              ) : (
                <div key={m.message_id} style={css('display:flex; gap:14px; align-items:flex-start')}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/athena-logo.png" alt="Athena" style={css('width:38px; height:38px; object-fit:contain; flex-shrink:0; margin-top:1px')} />
                  <div style={css('flex:1; min-width:0')}>
                    <div style={css('font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--red); opacity:.85; margin-bottom:6px')}>Athena</div>
                    <div style={css(`display:block; max-width:100%; background:var(--bg-card); border:1px solid ${m.error ? 'var(--red-dim)' : 'var(--border)'}; border-radius:4px 12px 12px 12px; padding:13px 16px`)}>
                      {m.error ? <span style={css('font-size:14px; color:var(--muted-light)')}>{m.content}</span> : <Markdown>{m.content}</Markdown>}
                      {m.attachment?.url && (
                        <a href={m.attachment.view_url || m.attachment.url} target="_blank" rel="noopener noreferrer" style={css('display:inline-flex; align-items:center; gap:8px; margin-top:6px; padding:8px 12px; border:1px solid var(--border); border-radius:8px; font-size:12px; color:var(--white); text-decoration:none')}>
                          <IC s={14} d='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' stroke="var(--green)" />
                          Abrir {m.attachment.file_type === 'sheet' ? 'planilha' : 'PDF'}
                        </a>
                      )}
                      {!m.error && (m.query || (m.sources && m.sources.length > 0)) && (
                        <details style={css('margin-top:10px; border-top:1px solid var(--border-faint); padding-top:10px')}>
                          <summary style={css('cursor:pointer; font-size:11px; letter-spacing:1.4px; text-transform:uppercase; color:var(--muted-light); font-weight:600')}>Como cheguei nesse resultado</summary>
                          {m.sources && m.sources.length > 0 && (
                            <div style={css('display:flex; flex-wrap:wrap; gap:6px; margin-top:10px')}>
                              {m.sources.map((s, si) => (
                                <span key={si} style={css('display:inline-flex; align-items:center; gap:6px; padding:4px 9px; border-radius:20px; border:1px solid var(--border); background:var(--bg-panel); font-size:11px; color:var(--muted-light)')}><span style={css('width:5px; height:5px; border-radius:50%; background:var(--green-dim)')} />{s.label}{s.detail ? ` · ${s.detail}` : ''}</span>
                              ))}
                            </div>
                          )}
                          {m.query && (
                            <pre style={css('margin:10px 0 0; padding:12px; background:var(--bg-code); border:1px solid var(--border); border-radius:10px; overflow-x:auto; font-family:\'SFMono-Regular\',Consolas,monospace; font-size:11.5px; line-height:1.7; color:var(--muted-light); white-space:pre-wrap; word-break:break-word')}>{m.query}</pre>
                          )}
                        </details>
                      )}
                    </div>
                    {!m.error && (
                      <div style={css('display:flex; align-items:center; gap:4px; margin-top:8px')}>
                        <B t="button" title="Ouvir" onClick={() => playTts(m.content)} c="padding:4px 9px; border-radius:6px; border:1px solid var(--border); background:transparent; color:var(--muted); font-family:'Open Sans',sans-serif; font-size:11px; cursor:pointer; display:inline-flex; align-items:center; gap:5px" h="border-color:var(--red-dim); color:var(--white)">{ic(12, '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>', 2)}Ouvir</B>
                        <B t="button" title="Copiar" onClick={() => navigator.clipboard?.writeText(m.content)} c="padding:4px 9px; border-radius:6px; border:1px solid var(--border); background:transparent; color:var(--muted); font-family:'Open Sans',sans-serif; font-size:11px; cursor:pointer; display:inline-flex; align-items:center; gap:5px" h="border-color:var(--red-dim); color:var(--white)">{ic(12, '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>', 2)}Copiar</B>
                        <span style={css('width:1px; height:14px; background:var(--border); margin:0 3px')} />
                        <B t="button" title="Resposta útil" onClick={() => sendFeedback(m, 'positive')} c={`padding:4px 8px; border-radius:6px; border:1px solid ${m.fb === 'positive' ? 'var(--green-dim)' : 'var(--border)'}; background:transparent; color:${m.fb === 'positive' ? 'var(--green)' : 'var(--muted)'}; cursor:pointer; display:inline-flex`} h="border-color:var(--green-dim); color:var(--green)">{ic(13, '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>')}</B>
                        <B t="button" title="Corrigir a Athena" onClick={() => { setFbOpen(fbOpen === m.message_id ? null : m.message_id); setFbComment(''); }} c={`padding:4px 8px; border-radius:6px; border:1px solid ${m.fb === 'negative' ? 'var(--red-dim)' : 'var(--border)'}; background:transparent; color:${m.fb === 'negative' ? 'var(--red)' : 'var(--muted)'}; cursor:pointer; display:inline-flex`} h="border-color:var(--red-dim); color:var(--red)">{ic(13, '<path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>')}</B>
                      </div>
                    )}
                    {fbOpen === m.message_id && (
                      <div style={css('margin-top:10px; border:1px solid var(--border-subtle); border-radius:10px; background:var(--bg-quiet, var(--bg-panel)); padding:12px')}>
                        <div style={css('font-size:12px; font-weight:600; margin-bottom:8px')}>O que estava errado? Sua correção vira aprendizado.</div>
                        <textarea value={fbComment} onChange={(e) => setFbComment(e.target.value)} rows={3} placeholder="Ex.: o status do PI deveria incluir Aprovado, não só Faturado." style={css('width:100%; resize:vertical; background:var(--bg-input); border:1px solid var(--border); border-radius:8px; padding:9px 11px; color:var(--white); font-family:\'Open Sans\',sans-serif; font-size:13px; outline:none')} />
                        <div style={css('display:flex; gap:8px; margin-top:9px')}>
                          <B t="button" onClick={() => sendFeedback(m, 'negative', fbComment)} c="padding:7px 14px; border:none; border-radius:8px; background:var(--red); color:#fff; font-family:'Open Sans',sans-serif; font-size:12px; font-weight:600; cursor:pointer" h="background:var(--red-dim)">Enviar correção</B>
                          <B t="button" onClick={() => setFbOpen(null)} c="padding:7px 12px; border:1px solid var(--border); border-radius:8px; background:transparent; color:var(--muted-light); font-family:'Open Sans',sans-serif; font-size:12px; cursor:pointer" h="color:var(--white)">Cancelar</B>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )))}
              {sending && (
                <div style={css('display:flex; gap:14px; align-items:flex-start')}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/athena-logo.png" alt="Athena" style={css('width:38px; height:38px; object-fit:contain; flex-shrink:0; margin-top:1px')} />
                  <div style={css('display:flex; align-items:center; gap:8px; padding:14px 16px; background:var(--bg-card); border:1px solid var(--border); border-radius:4px 12px 12px 12px')}>
                    <span style={{ ...css('width:6px; height:6px; border-radius:50%; background:var(--red)'), animation: 'thinkDot 1.25s ease-in-out infinite' }} />
                    <span style={{ ...css('width:6px; height:6px; border-radius:50%; background:var(--red)'), animation: 'thinkDot 1.25s ease-in-out .18s infinite' }} />
                    <span style={{ ...css('width:6px; height:6px; border-radius:50%; background:var(--red)'), animation: 'thinkDot 1.25s ease-in-out .36s infinite' }} />
                    <span style={css('font-size:12px; color:var(--muted); margin-left:4px')}>Consultando o Publi…</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COMPOSER */}
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
                style={css('width:100%; resize:none; min-height:26px; max-height:160px; background:transparent; border:none; outline:none; color:var(--white); font-family:\'Open Sans\',sans-serif; font-size:14.5px; line-height:1.6')}
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
