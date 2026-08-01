'use client';
import React, { useState } from 'react';
import {
  ChatCircle, Plus, MagnifyingGlass, CaretDown, ShieldCheck, SignOut,
  ChartBar, GearSix, Sparkle, Clock, CalendarDots, Archive,
  Moon, Sun, PencilSimple, Check, X, Trash, PushPin, CopySimple,
} from '@phosphor-icons/react';
import type { Conversation } from '@/lib/types';
import { relativeTime, initials } from '@/lib/format';
import { SidebarSkeleton } from './SkeletonLoaders';

/* ─── Types ─── */
interface SidebarProps {
  loading?: boolean;
  me: { name?: string; email?: string; admin?: boolean; picture?: string } | null;
  conversations: Conversation[];
  activeId: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  client: string;
  clients?: string[];
  onClientChange: (v: string) => void;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onLogout: () => void;
  backendDown: boolean;
  light?: boolean;
  onToggleTheme?: () => void;
  onRenameConversation?: (id: string, title: string) => void;
  onDeleteConversation?: (id: string) => void;
  // A7: Pin/duplicate
  onPinConversation?: (id: string) => void;
  onDuplicateConversation?: (id: string) => void;
  // A2: status per-conversa + badge de notificações
  sendingConvs?: Record<string, boolean>;
  convNotifs?: Record<string, number>;
}

/* ─── Group conversations by time ─── */
function groupByTime(conversations: Conversation[]) {
  const now = Date.now();
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;

  const groups: { label: string; icon: React.ReactNode; items: Conversation[] }[] = [
    { label: 'Fixadas', icon: <PushPin size={13} />, items: [] },
    { label: 'Hoje', icon: <Sparkle size={13} />, items: [] },
    { label: 'Ontem', icon: <Clock size={13} />, items: [] },
    { label: 'Esta semana', icon: <CalendarDots size={13} />, items: [] },
    { label: 'Anteriores', icon: <Archive size={13} />, items: [] },
  ];

  for (const c of conversations) {
    if (c.pinned) { groups[0].items.push(c); continue; }
    const t = c.updated_at ? new Date(c.updated_at).getTime() : 0;
    if (t >= today) groups[1].items.push(c);
    else if (t >= yesterday) groups[2].items.push(c);
    else if (t >= weekAgo) groups[3].items.push(c);
    else groups[4].items.push(c);
  }
  return groups.filter((g) => g.items.length > 0);
}

/* ─── Styles ─── */
const FALLBACK_CLIENTS = ['O Boticário', 'Eudora', 'Quem disse, Berenice?', 'Todos'];

const s = {
  root: {
    width: 'var(--sidebar-w)',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    background: 'var(--glass-surface)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRight: '1px solid var(--glass-border)',
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    padding: '22px 18px 0',
    flexShrink: 0,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '22px',
  },
  logoImg: {
    width: 56,
    height: 56,
    objectFit: 'contain' as const,
    flexShrink: 0,
    filter: 'drop-shadow(0 2px 8px rgba(221,0,4,.2))',
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '3px',
    color: 'var(--white)',
    lineHeight: 1,
  },
  logoSub: {
    fontSize: '10px',
    letterSpacing: '2px',
    color: 'var(--red)',
    fontWeight: 600,
    marginTop: '4px',
    textTransform: 'uppercase' as const,
  },
  newBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '9px',
    padding: '12px 18px',
    border: 'none',
    borderRadius: '12px',
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    color: '#fff',
    background: 'linear-gradient(135deg, var(--red), var(--red-dim))',
    boxShadow: '0 4px 16px rgba(221,0,4,.2)',
    transition: 'all .2s ease',
    marginBottom: '14px',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    padding: '9px 12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-faint)',
    borderRadius: '10px',
    transition: 'border-color .2s ease, box-shadow .2s ease',
    marginBottom: '10px',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--white)',
    fontFamily: 'var(--font-body)',
    fontSize: '13.5px',
  },
  divider: {
    height: '1px',
    background: 'var(--border-faint)',
    margin: '4px 18px',
    flexShrink: 0,
  },
  nav: {
    padding: '8px 18px 4px',
    flexShrink: 0,
  },
  navItem: (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 11px',
    borderRadius: '8px',
    fontSize: '13.5px',
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--white)' : 'var(--muted-light)',
    background: active ? 'var(--bg-panel)' : 'transparent',
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'var(--font-body)',
    width: '100%',
    textAlign: 'left' as const,
    textDecoration: 'none',
    transition: 'all .15s ease',
    marginBottom: '2px',
  }),
  clientWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    padding: '9px 12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-faint)',
    borderRadius: '10px',
  },
  clientLabel: {
    fontSize: '9.5px',
    letterSpacing: '1.4px',
    textTransform: 'uppercase' as const,
    color: 'var(--muted-dim)',
    fontWeight: 600,
    flexShrink: 0,
  },
  clientSelect: {
    flex: 1,
    minWidth: 0,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--white)',
    fontFamily: 'var(--font-body)',
    fontSize: '12.5px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  sectionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '10px 11px 5px',
    fontSize: '11.5px',
    fontWeight: 600,
    letterSpacing: '0.6px',
    textTransform: 'uppercase' as const,
    color: 'var(--muted-dim)',
  },
  convList: {
    flex: 1,
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    padding: '4px 10px',
  },
  convItem: (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
    padding: '9px 11px',
    borderRadius: '8px',
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'var(--font-body)',
    width: '100%',
    textAlign: 'left' as const,
    background: active ? 'var(--bg-panel)' : 'transparent',
    transition: 'background .15s ease',
    marginBottom: '2px',
  }),
  convIcon: (active: boolean) => ({
    width: 32,
    height: 32,
    borderRadius: 8,
    flexShrink: 0,
    background: active ? 'rgba(221,0,4,0.1)' : 'var(--bg-input)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  convTitle: (active: boolean) => ({
    display: 'block',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: '13.5px',
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--white)' : 'var(--muted-light)',
    lineHeight: '1.3',
  }),
  convMeta: {
    display: 'flex',
    gap: '6px',
    marginTop: '2px',
    fontSize: '11px',
    color: 'var(--muted-dim)',
  },
  badge: (color: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 500,
    background: `${color}14`,
    color: color,
    border: `1px solid ${color}22`,
  }),
  footer: {
    flexShrink: 0,
    padding: '14px 18px 18px',
    borderTop: '1px solid var(--border-faint)',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    flexShrink: 0,
    background: 'linear-gradient(135deg, var(--red-dim), var(--red))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
    overflow: 'hidden',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--white)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userEmail: {
    fontSize: '11.5px',
    color: 'var(--muted-dim)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: '2px',
  },
  logoutBtn: {
    background: 'none',
    border: '1px solid var(--border-faint)',
    borderRadius: '8px',
    color: 'var(--muted-dim)',
    cursor: 'pointer',
    padding: '7px',
    display: 'flex',
    flexShrink: 0,
    transition: 'all .2s ease',
  },
} as const;

/* ─── Component ─── */
export function Sidebar({
  me, conversations, activeId, search, onSearchChange,
  client, clients, onClientChange, onSelectConversation, onNewConversation,
  onLogout, backendDown, light, onToggleTheme, onRenameConversation, onDeleteConversation, loading,
  onPinConversation, onDuplicateConversation,
  sendingConvs = {}, convNotifs = {},
}: SidebarProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const filtered = search
    ? conversations.filter((c) => (c.title || '').toLowerCase().includes(search.toLowerCase()))
    : conversations;
  const groups = groupByTime(filtered);

  return (
    <aside style={s.root}>
      {/* ═══ Header ═══ */}
      <div style={s.header}>
        {/* Logo */}
        <div style={s.logo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/athena-logo.png" alt="Athena" style={s.logoImg} />
          <div>
            <div style={s.logoText}>ATHENA</div>
            <div style={s.logoSub}>OpusMúltipla</div>
          </div>
        </div>

        {/* New conversation */}
        <button
          onClick={onNewConversation}
          style={s.newBtn}
          onMouseEnter={(e) => { (e.currentTarget.style.background = 'linear-gradient(135deg, var(--red-dim), var(--wine))'); (e.currentTarget.style.boxShadow = '0 6px 20px rgba(221,0,4,0.3)'); (e.currentTarget.style.transform = 'translateY(-1px)'); }}
          onMouseLeave={(e) => { (e.currentTarget.style.background = 'linear-gradient(135deg, var(--red), var(--red-dim))'); (e.currentTarget.style.boxShadow = '0 4px 16px rgba(221,0,4,0.2)'); (e.currentTarget.style.transform = 'translateY(0)'); }}
        >
          <Plus size={16} weight="bold" /> Nova conversa
        </button>

        {/* Search */}
        <div style={s.searchWrap}>
          <MagnifyingGlass size={15} color="var(--muted-dim)" />
          <input data-search-input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Buscar conversas… (Ctrl+K)" style={s.searchInput} />
        </div>
      </div>

      {/* ═══ Nav items ═══ */}
      <div style={s.nav}>
        <div style={s.clientWrap}>
          <span style={s.clientLabel}>Cliente</span>
          <select value={client} onChange={(e) => onClientChange(e.target.value)} style={s.clientSelect}>
            {(clients && clients.length > 0 ? clients : FALLBACK_CLIENTS).map((c) => (
              <option key={c} style={{ background: '#1a1918' }}>{c}</option>
            ))}
          </select>
          <CaretDown size={12} color="var(--muted-dim)" />
        </div>
      </div>

      <div style={s.divider} />

      {/* ═══ Conversation list ═══ */}
      <div style={s.convList}>
        {loading ? (
          <SidebarSkeleton count={6} />
        ) : backendDown ? (
          <div style={{ padding: '28px 12px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <ChatCircle size={20} color="var(--muted-dim)" />
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--muted-light)', marginBottom: 4 }}>Sem conexão</div>
            <div style={{ fontSize: '12px', color: 'var(--muted-dim)', lineHeight: 1.6 }}>Configure o backend para ver suas conversas aqui.</div>
            <div style={{ ...s.badge('var(--gold)'), marginTop: 10, display: 'inline-flex' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)' }} />
              offline
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div style={{ padding: '28px 12px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <ChatCircle size={20} color="var(--muted-dim)" />
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--muted-light)', marginBottom: 4 }}>
              {search ? 'Nenhum resultado' : 'Nenhuma conversa'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted-dim)', lineHeight: 1.6 }}>
              {search ? 'Tente outra busca.' : 'Clique em "Nova conversa" para começar.'}
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div style={s.sectionLabel}>
                {group.icon}
                {group.label}
                <span style={{ ...s.badge('var(--muted)'), marginLeft: 'auto', fontSize: '10px', padding: '1px 6px' }}>{group.items.length}</span>
              </div>

              {group.items.map((c) => {
                const on = c.conversation_id === activeId;
                const isHov = hovered === c.conversation_id;
                return (
                  <button
                    key={c.conversation_id}
                    onClick={() => editingId !== c.conversation_id && onSelectConversation(c.conversation_id)}
                    onDoubleClick={() => {
                      if (onRenameConversation) {
                        setEditingId(c.conversation_id);
                        setEditVal(c.title || '');
                      }
                    }}
                    onMouseEnter={() => setHovered(c.conversation_id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      ...s.convItem(on),
                      ...(isHov && !on ? { background: 'var(--glass-hover)' } : {}),
                    }}
                  >
                    <div style={s.convIcon(on)}>
                      <ChatCircle size={14} color={on ? 'var(--red)' : 'var(--muted)'} weight={on ? 'fill' : 'regular'} />
                    </div>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      {editingId === c.conversation_id ? (
                        <input
                          autoFocus
                          value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editVal.trim()) {
                              onRenameConversation?.(c.conversation_id, editVal.trim());
                              setEditingId(null);
                            }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '100%', background: 'var(--bg-input)', border: '1px solid var(--red-dim)',
                            borderRadius: 6, padding: '3px 8px', color: 'var(--white)', fontFamily: 'var(--font-body)',
                            fontSize: '12.5px', fontWeight: 600, outline: 'none',
                          }}
                        />
                      ) : (
                        <span style={s.convTitle(on)}>{c.title || 'Sem título'}</span>
                      )}
                      <span style={s.convMeta}>
                        {/* A2: status Pensando / badge notificação */}
                        {sendingConvs[c.conversation_id] && (
                          <span style={{ color: 'var(--gold)', fontSize: 10.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', animation: 'pulse 1.2s ease-in-out infinite' }} />
                            Pensando…
                          </span>
                        )}
                        {!sendingConvs[c.conversation_id] && (convNotifs[c.conversation_id] || 0) > 0 && (
                          <span style={{ background: 'var(--red)', color: '#fff', fontSize: 9.5, fontWeight: 700, borderRadius: 8, padding: '1px 6px', minWidth: 16, textAlign: 'center' as const }}>
                            {convNotifs[c.conversation_id]} nova
                          </span>
                        )}
                        <span>{relativeTime(c.updated_at)}</span>
                        {c.message_count > 0 && <span>· {c.message_count} msg</span>}
                      </span>
                    </span>
                    {/* Pencil icon on hover */}
                    {isHov && !editingId && onRenameConversation && (
                      <span style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(c.conversation_id);
                            setEditVal(c.title || '');
                          }}
                          style={{ color: 'var(--muted)', cursor: 'pointer', padding: 3, display: 'flex', borderRadius: 4, transition: 'color .15s' }}
                        >
                          <PencilSimple size={12} />
                        </span>
                        {onDeleteConversation && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteConversation(c.conversation_id);
                            }}
                            style={{ color: 'var(--muted)', cursor: 'pointer', padding: 3, display: 'flex', borderRadius: 4, transition: 'color .15s' }}
                            title="Excluir"
                          >
                            <Trash size={12} />
                          </span>
                        )}
                        {onPinConversation && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onPinConversation(c.conversation_id);
                            }}
                            style={{ color: c.pinned ? 'var(--red)' : 'var(--muted)', cursor: 'pointer', padding: 3, display: 'flex', borderRadius: 4, transition: 'color .15s' }}
                            title={c.pinned ? 'Desafixar' : 'Fixar'}
                          >
                            <PushPin size={12} weight={c.pinned ? 'fill' : 'regular'} />
                          </span>
                        )}
                        {onDuplicateConversation && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateConversation(c.conversation_id);
                            }}
                            style={{ color: 'var(--muted)', cursor: 'pointer', padding: 3, display: 'flex', borderRadius: 4, transition: 'color .15s' }}
                            title="Duplicar"
                          >
                            <CopySimple size={12} />
                          </span>
                        )}
                      </span>
                    )}
                    {editingId === c.conversation_id && (
                      <span style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editVal.trim()) onRenameConversation?.(c.conversation_id, editVal.trim());
                            setEditingId(null);
                          }}
                          style={{ color: 'var(--red)', cursor: 'pointer', padding: 3, display: 'flex' }}
                        >
                          <Check size={14} weight="bold" />
                        </span>
                        <span
                          onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                          style={{ color: 'var(--muted)', cursor: 'pointer', padding: 3, display: 'flex' }}
                        >
                          <X size={14} />
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}

              <div style={{ ...s.divider, margin: '6px 6px' }} />
            </div>
          ))
        )}
      </div>

      {/* ═══ Bottom nav ═══ */}
      {me?.admin && (
        <>
          <div style={s.divider} />
          <div style={{ padding: '4px 10px' }}>
            <a href="/admin" style={{ ...s.navItem(false), textDecoration: 'none' }}>
              <ShieldCheck size={17} color="var(--muted)" />
              Painel de Auditoria
              <span style={{ ...s.badge('var(--green)'), marginLeft: 'auto' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />
                admin
              </span>
            </a>
            <a href="/admin" style={{ ...s.navItem(false), textDecoration: 'none' }}>
              <ChartBar size={17} color="var(--muted)" />
              Relatórios
            </a>
            <a href="/admin?tab=config" style={{ ...s.navItem(false), textDecoration: 'none' }}>
              <GearSix size={17} color="var(--muted)" />
              Configurações
            </a>
          </div>
        </>
      )}
      {/* Saori agora e icone flutuante no chat, sem link na sidebar */}

      {/* OpusMultipla */}
      <div style={{ padding: '6px 18px 4px', textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/opus-multipla-logo.png" alt="OpusMultipla" style={{ maxWidth: 90, height: 'auto', opacity: 0.22 }} />
      </div>

      {/* ═══ User footer ═══ */}
      <div style={s.footer}>
        <div style={s.userRow}>
          {me?.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.picture} alt="" referrerPolicy="no-referrer" style={{ ...s.avatar, objectFit: 'cover' as const }} />
          ) : (
            <div style={s.avatar}>{initials(me?.name || me?.email)}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.userName}>{me?.name || 'Usuário'}</div>
            <div style={s.userEmail}>{me?.email}</div>
          </div>
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              title={light ? 'Tema escuro' : 'Tema claro'}
              style={s.logoutBtn}
              onMouseEnter={(e) => { (e.currentTarget.style.color = 'var(--white)'); (e.currentTarget.style.borderColor = 'var(--red-dim)'); }}
              onMouseLeave={(e) => { (e.currentTarget.style.color = 'var(--muted-dim)'); (e.currentTarget.style.borderColor = 'var(--border-faint)'); }}
            >
              {light ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          )}
          <button
            onClick={onLogout}
            title="Sair"
            style={s.logoutBtn}
            onMouseEnter={(e) => { (e.currentTarget.style.color = 'var(--red)'); (e.currentTarget.style.borderColor = 'rgba(221,0,4,0.2)'); }}
            onMouseLeave={(e) => { (e.currentTarget.style.color = 'var(--muted-dim)'); (e.currentTarget.style.borderColor = 'var(--border-faint)'); }}
          >
            <SignOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
