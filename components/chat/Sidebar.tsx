'use client';
import React, { useState } from 'react';
import {
  MessageSquare, Plus, Search, ChevronDown, Shield, LogOut,
  BarChart3, Settings, Sparkles, Clock, CalendarDays, Archive,
  Moon, Sun, Pencil, Check, X, Trash2,
} from 'lucide-react';
import type { Conversation } from '@/lib/types';
import { relativeTime, initials } from '@/lib/format';

/* ─── Types ─── */
interface SidebarProps {
  me: { name?: string; email?: string; admin?: boolean } | null;
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
}

/* ─── Group conversations by time ─── */
function groupByTime(conversations: Conversation[]) {
  const now = Date.now();
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;

  const groups: { label: string; icon: React.ReactNode; items: Conversation[] }[] = [
    { label: 'Hoje', icon: <Sparkles size={12} />, items: [] },
    { label: 'Ontem', icon: <Clock size={12} />, items: [] },
    { label: 'Esta semana', icon: <CalendarDays size={12} />, items: [] },
    { label: 'Anteriores', icon: <Archive size={12} />, items: [] },
  ];

  for (const c of conversations) {
    const t = c.updated_at ? new Date(c.updated_at).getTime() : 0;
    if (t >= today) groups[0].items.push(c);
    else if (t >= yesterday) groups[1].items.push(c);
    else if (t >= weekAgo) groups[2].items.push(c);
    else groups[3].items.push(c);
  }
  return groups.filter((g) => g.items.length > 0);
}

/* ─── Styles (module-like, no inline strings) ─── */
const FALLBACK_CLIENTS = ['O Boticário', 'Eudora', 'Quem disse, Berenice?', 'Todos'];

const s = {
  root: {
    width: 'var(--sidebar-w)',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    background: 'var(--bg-surface)',
    borderRight: '1px solid var(--border-faint)',
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    padding: '20px 16px 0',
    flexShrink: 0,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
  },
  logoImg: {
    width: 44,
    height: 44,
    objectFit: 'contain' as const,
    flexShrink: 0,
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontSize: '17px',
    fontWeight: 700,
    letterSpacing: '2.5px',
    color: 'var(--white)',
    lineHeight: 1,
  },
  logoSub: {
    fontSize: '8px',
    letterSpacing: '1.8px',
    color: 'var(--red)',
    fontWeight: 600,
    marginTop: '3px',
    textTransform: 'uppercase' as const,
  },
  newBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    color: '#fff',
    background: 'var(--red)',
    transition: 'all .15s ease',
    marginBottom: '12px',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-faint)',
    borderRadius: '8px',
    transition: 'border-color .15s ease',
    marginBottom: '8px',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--white)',
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
  },
  divider: {
    height: '1px',
    background: 'var(--border-faint)',
    margin: '4px 16px',
    flexShrink: 0,
  },
  nav: {
    padding: '8px 16px 4px',
    flexShrink: 0,
  },
  navItem: (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--white)' : 'var(--muted-light)',
    background: active ? 'var(--bg-panel)' : 'transparent',
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'var(--font-body)',
    width: '100%',
    textAlign: 'left' as const,
    textDecoration: 'none',
    transition: 'all .12s ease',
    marginBottom: '2px',
  }),
  clientWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-faint)',
    borderRadius: '8px',
  },
  clientLabel: {
    fontSize: '9px',
    letterSpacing: '1.2px',
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
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  sectionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 10px 4px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
    color: 'var(--muted-dim)',
  },
  convList: {
    flex: 1,
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    padding: '4px 8px',
  },
  convItem: (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'var(--font-body)',
    width: '100%',
    textAlign: 'left' as const,
    background: active ? 'var(--bg-panel)' : 'transparent',
    transition: 'background .12s ease',
    marginBottom: '1px',
  }),
  convIcon: (active: boolean) => ({
    width: 28,
    height: 28,
    borderRadius: 6,
    flexShrink: 0,
    background: active ? 'rgba(221,0,4,0.08)' : 'var(--bg-input)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  convTitle: (active: boolean) => ({
    display: 'block',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--white)' : 'var(--muted-light)',
    lineHeight: '1.3',
  }),
  convMeta: {
    display: 'flex',
    gap: '6px',
    marginTop: '1px',
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
    padding: '12px 16px 16px',
    borderTop: '1px solid var(--border-faint)',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    flexShrink: 0,
    background: 'linear-gradient(135deg, var(--red-dim), var(--red))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontSize: '12px',
    fontWeight: 700,
    color: '#fff',
  },
  userName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--white)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userEmail: {
    fontSize: '11px',
    color: 'var(--muted-dim)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: '1px',
  },
  logoutBtn: {
    background: 'none',
    border: '1px solid var(--border-faint)',
    borderRadius: '6px',
    color: 'var(--muted-dim)',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    flexShrink: 0,
    transition: 'all .15s ease',
  },
} as const;

/* ─── Component ─── */
export function Sidebar({
  me, conversations, activeId, search, onSearchChange,
  client, clients, onClientChange, onSelectConversation, onNewConversation,
  onLogout, backendDown, light, onToggleTheme, onRenameConversation, onDeleteConversation,
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
          onMouseEnter={(e) => { (e.currentTarget.style.background = 'var(--red-dim)'); (e.currentTarget.style.boxShadow = '0 4px 12px rgba(221,0,4,0.25)'); }}
          onMouseLeave={(e) => { (e.currentTarget.style.background = 'var(--red)'); (e.currentTarget.style.boxShadow = 'none'); }}
        >
          <Plus size={15} strokeWidth={2.5} /> Nova conversa
        </button>

        {/* Search */}
        <div style={s.searchWrap}>
          <Search size={14} color="var(--muted-dim)" />
          <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Buscar conversas…" style={s.searchInput} />
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
          <ChevronDown size={12} color="var(--muted-dim)" />
        </div>
      </div>

      <div style={s.divider} />

      {/* ═══ Conversation list ═══ */}
      <div style={s.convList}>
        {backendDown ? (
          <div style={{ padding: '28px 12px', textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <MessageSquare size={18} color="var(--muted-dim)" />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted-light)', marginBottom: 4 }}>Sem conexão</div>
            <div style={{ fontSize: '12px', color: 'var(--muted-dim)', lineHeight: 1.6 }}>Configure o backend para ver suas conversas aqui.</div>
            <div style={s.badge('var(--gold)')}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)' }} />
              offline
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div style={{ padding: '28px 12px', textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <MessageSquare size={18} color="var(--muted-dim)" />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted-light)', marginBottom: 4 }}>
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
                      ...(isHov && !on ? { background: 'var(--bg-input)' } : {}),
                    }}
                  >
                    <div style={s.convIcon(on)}>
                      <MessageSquare size={13} color={on ? 'var(--red)' : 'var(--muted)'} strokeWidth={on ? 2 : 1.5} />
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
                            borderRadius: 4, padding: '2px 6px', color: 'var(--white)', fontFamily: 'var(--font-body)',
                            fontSize: '12px', fontWeight: 600, outline: 'none',
                          }}
                        />
                      ) : (
                        <span style={s.convTitle(on)}>{c.title || 'Sem título'}</span>
                      )}
                      <span style={s.convMeta}>
                        <span>{relativeTime(c.updated_at)}</span>
                        {c.message_count > 0 && <span>· {c.message_count} msg</span>}
                      </span>
                    </span>
                    {/* Pencil icon on hover */}
                    {isHov && !editingId && onRenameConversation && (
                      <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(c.conversation_id);
                            setEditVal(c.title || '');
                          }}
                          style={{ color: 'var(--muted)', cursor: 'pointer', padding: 2, display: 'flex' }}
                        >
                          <Pencil size={11} />
                        </span>
                        {onDeleteConversation && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteConversation(c.conversation_id);
                            }}
                            style={{ color: 'var(--muted)', cursor: 'pointer', padding: 2, display: 'flex' }}
                          >
                            <Trash2 size={11} />
                          </span>
                        )}
                      </span>
                    )}
                    {editingId === c.conversation_id && (
                      <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editVal.trim()) onRenameConversation?.(c.conversation_id, editVal.trim());
                            setEditingId(null);
                          }}
                          style={{ color: 'var(--red)', cursor: 'pointer', padding: 2, display: 'flex' }}
                        >
                          <Check size={13} strokeWidth={2.5} />
                        </span>
                        <span
                          onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                          style={{ color: 'var(--muted)', cursor: 'pointer', padding: 2, display: 'flex' }}
                        >
                          <X size={13} />
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}

              <div style={{ ...s.divider, margin: '6px 4px' }} />
            </div>
          ))
        )}
      </div>

      {/* ═══ Bottom nav ═══ */}
      {me?.admin && (
        <>
          <div style={s.divider} />
          <div style={{ padding: '4px 8px' }}>
            <a href="/admin" style={{ ...s.navItem(false), textDecoration: 'none' }}>
              <Shield size={16} color="var(--muted)" />
              Painel de Auditoria
              <span style={{ ...s.badge('var(--green)'), marginLeft: 'auto' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />
                admin
              </span>
            </a>
            <a href="/admin" style={{ ...s.navItem(false), textDecoration: 'none' }}>
              <BarChart3 size={16} color="var(--muted)" />
              Relatórios
            </a>
            <a href="/admin?tab=config" style={{ ...s.navItem(false), textDecoration: 'none' }}>
              <Settings size={16} color="var(--muted)" />
              Configurações
            </a>
          </div>
        </>
      )}

      {/* ═══ OpusMúltipla ═══ */}
      <div style={{ padding: '4px 16px 2px', textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/opus-multipla-logo.png" alt="OpusMúltipla" style={{ maxWidth: 85, height: 'auto', opacity: 0.2 }} />
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
              {light ? <Moon size={14} /> : <Sun size={14} />}
            </button>
          )}
          <button
            onClick={onLogout}
            title="Sair"
            style={s.logoutBtn}
            onMouseEnter={(e) => { (e.currentTarget.style.color = 'var(--red)'); (e.currentTarget.style.borderColor = 'rgba(221,0,4,0.2)'); }}
            onMouseLeave={(e) => { (e.currentTarget.style.color = 'var(--muted-dim)'); (e.currentTarget.style.borderColor = 'var(--border-faint)'); }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
