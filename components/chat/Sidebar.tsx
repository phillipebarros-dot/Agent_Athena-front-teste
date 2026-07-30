'use client';
import React from 'react';
import { B, IC, css } from '@/lib/dc';
import type { Conversation } from '@/lib/types';
import { relativeTime, initials } from '@/lib/format';

interface SidebarProps {
  me: { name?: string; email?: string; admin?: boolean } | null;
  conversations: Conversation[];
  activeId: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  client: string;
  onClientChange: (v: string) => void;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onLogout: () => void;
  backendDown: boolean;
}

export function Sidebar({
  me, conversations, activeId, search, onSearchChange,
  client, onClientChange, onSelectConversation, onNewConversation,
  onLogout, backendDown,
}: SidebarProps) {
  const filtered = search
    ? conversations.filter((c) => (c.title || '').toLowerCase().includes(search.toLowerCase()))
    : conversations;

  return (
    <aside style={css('width:var(--sidebar-w); flex-shrink:0; background:var(--bg-surface); display:flex; flex-direction:column')}>
      {/* Logo */}
      <div style={css('height:60px; flex-shrink:0; padding:0 16px; display:flex; align-items:center; gap:11px')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/athena-logo.png" alt="Athena" style={css('width:40px; height:40px; object-fit:contain; flex-shrink:0')} />
        <div style={css('min-width:0')}>
          <div style={css("font-family:var(--font-display); font-size:17px; font-weight:700; letter-spacing:2.5px; line-height:1.05")}>ATHENA</div>
          <div style={css('font-size:9px; letter-spacing:1.8px; color:var(--red); font-weight:700; margin-top:2px')}>OPUSMÚLTIPLA</div>
        </div>
      </div>

      {/* Controles */}
      <div style={css('padding:12px 16px 10px; display:flex; flex-direction:column; gap:10px')}>
        {/* Cliente */}
        <div style={css('display:flex; align-items:center; gap:8px; padding:8px 11px; background:var(--bg-panel); border:1px solid var(--border); border-radius:8px')}>
          <span style={css('font-size:9px; letter-spacing:1.3px; text-transform:uppercase; color:var(--muted); font-weight:600; flex-shrink:0')}>Cliente</span>
          <select value={client} onChange={(e) => onClientChange(e.target.value)} style={css('flex:1; min-width:0; background:transparent; border:none; outline:none; color:var(--white); font-family:var(--font-body); font-size:12.5px; cursor:pointer')}>
            <option style={{ color: '#000' }}>O Boticário</option>
            <option style={{ color: '#000' }}>Eudora</option>
            <option style={{ color: '#000' }}>Quem disse, Berenice?</option>
            <option style={{ color: '#000' }}>Todos</option>
          </select>
        </div>

        {/* Nova conversa */}
        <B t="button" onClick={onNewConversation} c="padding:10px 14px; background:rgba(196,30,30,.1); border:1px solid var(--red-dim); border-radius:8px; color:var(--white); font-family:var(--font-body); font-size:13px; font-weight:500; cursor:pointer; display:flex; align-items:center; gap:8px" h="background:rgba(196,30,30,.18); border-color:var(--red)">
          <span style={css('font-size:15px; line-height:1')}>+</span> Nova conversa
        </B>

        {/* Busca */}
        <div style={css('display:flex; align-items:center; gap:8px; padding:8px 12px; background:var(--bg-input); border:1px solid var(--border); border-radius:8px')}>
          <IC s={13} d='<circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.5" y2="16.5"/>' stroke="var(--muted)" />
          <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Buscar conversas" style={css('flex:1; min-width:0; background:transparent; border:none; outline:none; color:var(--white); font-family:var(--font-body); font-size:12.5px')} />
        </div>
      </div>

      {/* Lista de conversas */}
      <div style={css('flex:1; overflow-y:auto; padding:4px 8px 12px')}>
        {backendDown ? (
          <div style={css('padding:14px 12px; font-size:12px; color:var(--muted); line-height:1.6')}>Sem conexão com o backend. As conversas reais aparecem aqui quando <code style={{ fontFamily: 'monospace' }}>ATHENA_BACKEND_URL</code> estiver configurada.</div>
        ) : filtered.length === 0 ? (
          <div style={css('padding:14px 12px; font-size:12px; color:var(--muted); line-height:1.6')}>{search ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa ainda. Clique em "Nova conversa".'}</div>
        ) : (
          filtered.map((c) => {
            const on = c.conversation_id === activeId;
            return (
              <B key={c.conversation_id} onClick={() => onSelectConversation(c.conversation_id)} c={`padding:9px 11px; border-radius:7px; font-size:13px; cursor:pointer; margin-bottom:2px; border:1px solid ${on ? 'var(--border)' : 'transparent'}; background:${on ? 'var(--bg-panel)' : 'transparent'}; display:flex; align-items:center; gap:9px`} h="background:var(--bg-panel)">
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

      {/* Admin link */}
      {me?.admin && (
        <div style={css('padding:12px 16px; border-top:1px solid var(--border)')}>
          <B t="a" href="/admin" c="padding:10px 14px; background:transparent; border:1px dashed var(--border); border-radius:8px; color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.5px; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px" h="border-color:var(--red-dim); color:var(--white); background:rgba(196,30,30,.06)">
            <IC s={13} d='<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' w={2} /> Painel de Auditoria
          </B>
        </div>
      )}

      {/* Logo OpusMúltipla */}
      <div style={css('padding:10px 20px 6px; text-align:center')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/opus-multipla-logo.png" alt="OpusMultipla" style={css('max-width:104px; height:auto; opacity:.35; filter:grayscale(.3)')} />
      </div>

      {/* User footer */}
      <div style={css('padding:12px 16px; border-top:1px solid var(--border); display:flex; align-items:center; gap:10px')}>
        <div style={css('width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,var(--red-dim),var(--red)); display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-size:12px; font-weight:600; color:var(--white); flex-shrink:0')}>{initials(me?.name || me?.email)}</div>
        <div style={css('flex:1; min-width:0')}>
          <div style={css('font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{me?.name || 'Usuário'}</div>
          <div style={css('font-size:10px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{me?.email}</div>
        </div>
        <B t="button" onClick={onLogout} title="Sair" c="background:none; border:none; color:var(--muted); cursor:pointer; padding:4px; display:flex; flex-shrink:0" h="color:var(--red)">
          <IC s={14} d='<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>' />
        </B>
      </div>
    </aside>
  );
}
