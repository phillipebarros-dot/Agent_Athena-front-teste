'use client';
import React from 'react';
import { B, IC, css } from '@/lib/dc';

interface ChatHeaderProps {
  activeTitle: string;
  activeId: string | null;
  renaming: boolean;
  renameVal: string;
  onRenameValChange: (v: string) => void;
  onStartRename: () => void;
  onDoRename: () => void;
  onCancelRename: () => void;
  light: boolean;
  onToggleTheme: () => void;
}

export function ChatHeader({
  activeTitle, activeId, renaming, renameVal,
  onRenameValChange, onStartRename, onDoRename, onCancelRename,
  light, onToggleTheme,
}: ChatHeaderProps) {
  const themeIcon = light
    ? <IC s={14} d='<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>' w={2} />
    : <IC s={15} d='<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>' w={2} />;

  return (
    <div style={css('height:60px; flex-shrink:0; padding:0 20px 0 24px; display:flex; align-items:center; gap:12px; background:var(--bg-surface); box-shadow:0 6px 18px -8px rgba(0,0,0,.75); z-index:3')}>
      <div style={css('flex:1; min-width:0; display:flex; align-items:center; gap:9px')}>
        {renaming ? (
          <>
            <input autoFocus value={renameVal} onChange={(e) => onRenameValChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onDoRename(); if (e.key === 'Escape') onCancelRename(); }} style={css("flex:1; min-width:0; max-width:420px; padding:6px 10px; background:var(--bg-input); border:1px solid var(--red-dim); border-radius:7px; outline:none; color:var(--white); font-family:var(--font-body); font-size:14px; font-weight:600")} />
            <B t="button" onClick={onDoRename} c="padding:6px 12px; border:none; border-radius:7px; background:var(--red); color:#fff; font-family:var(--font-body); font-size:11.5px; font-weight:600; cursor:pointer; flex-shrink:0" h="background:var(--red-dim)">Salvar</B>
          </>
        ) : (
          <>
            <span style={css('font-size:14px; font-weight:600; color:var(--white); white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{activeTitle}</span>
            {activeId && (
              <B t="button" onClick={onStartRename} title="Renomear" c="background:none; border:none; padding:4px; border-radius:5px; color:var(--muted-dim); cursor:pointer; display:flex; flex-shrink:0" h="color:var(--white); background:var(--bg-panel)">
                <IC s={13} d='<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>' />
              </B>
            )}
          </>
        )}
      </div>
      <B t="button" onClick={onToggleTheme} title={light ? 'Tema escuro' : 'Tema claro'} c="width:32px; height:32px; background:transparent; border:1px solid var(--border); border-radius:8px; color:var(--muted); cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0" h="border-color:var(--red-dim); color:var(--white)">{themeIcon}</B>
    </div>
  );
}
