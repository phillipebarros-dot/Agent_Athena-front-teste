'use client';
import React from 'react';
import { PencilSimple, Moon, Sun, Check, X } from '@phosphor-icons/react';

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

const s = {
  root: {
    height: 52,
    flexShrink: 0,
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border-faint)',
    zIndex: 3,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--white)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    paddingBottom: 2,
    borderBottom: '2px solid var(--red)',
  },
  renameInput: {
    flex: 1,
    minWidth: 0,
    maxWidth: 420,
    padding: '6px 10px',
    background: 'var(--bg-input)',
    border: '1px solid var(--red-dim)',
    borderRadius: 6,
    outline: 'none',
    color: 'var(--white)',
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    fontWeight: 600,
  },
  iconBtn: {
    width: 30,
    height: 30,
    background: 'transparent',
    border: '1px solid var(--border-faint)',
    borderRadius: 6,
    color: 'var(--muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all .15s ease',
    padding: 0,
  },
  saveBtn: {
    padding: '5px 12px',
    border: 'none',
    borderRadius: 6,
    background: 'var(--red)',
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    transition: 'background .15s ease',
  },
  cancelBtn: {
    padding: '5px 10px',
    border: '1px solid var(--border-faint)',
    borderRadius: 6,
    background: 'transparent',
    color: 'var(--muted)',
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    transition: 'all .15s ease',
  },
} as const;

export function ChatHeader({
  activeTitle, activeId, renaming, renameVal,
  onRenameValChange, onStartRename, onDoRename, onCancelRename,
  light, onToggleTheme,
}: ChatHeaderProps) {
  return (
    <div style={s.root}>
      <div style={s.titleWrap}>
        {renaming ? (
          <>
            <input
              autoFocus
              value={renameVal}
              onChange={(e) => onRenameValChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onDoRename(); if (e.key === 'Escape') onCancelRename(); }}
              style={s.renameInput}
            />
            <button
              onClick={onDoRename}
              style={s.saveBtn}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--red-dim)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--red)'; }}
            >
              <Check size={12} strokeWidth={2.5} /> Salvar
            </button>
            <button onClick={onCancelRename} style={s.cancelBtn}>
              <X size={12} /> Cancelar
            </button>
          </>
        ) : (
          <>
            <span style={s.title}>{activeTitle}</span>
            {activeId && (
              <button
                onClick={onStartRename}
                title="Renomear"
                style={s.iconBtn}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--white)'; e.currentTarget.style.borderColor = 'var(--red-dim)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border-faint)'; }}
              >
                <PencilSimple size={12} />
              </button>
            )}
          </>
        )}
      </div>

      <button
        onClick={onToggleTheme}
        title={light ? 'Tema escuro' : 'Tema claro'}
        style={s.iconBtn}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--red-dim)'; e.currentTarget.style.color = 'var(--white)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-faint)'; e.currentTarget.style.color = 'var(--muted)'; }}
      >
        {light ? <Moon size={14} /> : <Sun size={14} />}
      </button>
    </div>
  );
}
