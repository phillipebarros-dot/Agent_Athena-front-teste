'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { css } from '@/lib/dc';

export interface ContextChip {
  key: string;
  label: string;
  value: string;
  options?: string[];
}

interface ContextBarProps {
  chips: ContextChip[];
  onChipChange: (key: string, value: string) => void;
  onClearAll: () => void;
}

const chipStyle = (active: boolean) => css(`
  display:inline-flex; align-items:center; gap:5px; padding:4px 10px;
  border-radius:7px; font-size:11.5px; font-weight:600;
  cursor:pointer; transition:all .2s;
  border:1px solid ${active ? 'var(--red-dim)' : 'var(--border)'};
  background:${active ? 'rgba(196,30,30,.1)' : 'rgba(255,255,255,.04)'};
  color:${active ? 'var(--white)' : 'var(--fg-3)'};
`);

export function ContextBar({ chips, onChipChange, onClearAll }: ContextBarProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const hasValues = chips.some(c => c.value);
  const filledCount = chips.filter(c => c.value).length;

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, [data-no-drag]')) return;
    dragging.current = true;
    const rect = dragRef.current?.getBoundingClientRect();
    if (rect) {
      offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const x = e.clientX - offset.current.x;
      const y = e.clientY - offset.current.y;
      // Clamp to viewport
      const maxX = window.innerWidth - (dragRef.current?.offsetWidth || 300);
      const maxY = window.innerHeight - (dragRef.current?.offsetHeight || 60);
      setPos({ x: Math.max(0, Math.min(x, maxX)), y: Math.max(0, Math.min(y, maxY)) });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // Collapsed pill — minimal indicator
  if (!expanded) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setExpanded(true)}
        title="Abrir contexto fixado"
        style={css(`
          position:absolute; top:12px; right:60px; z-index:15;
          display:flex; align-items:center; gap:6px;
          padding:6px 12px; border-radius:20px;
          background:var(--glass-surface); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
          border:1px solid var(--glass-border);
          color:var(--muted-light); font-size:11px; font-weight:600;
          cursor:pointer; box-shadow:var(--shadow-md);
          font-family:var(--font-body);
          transition:border-color .2s, box-shadow .2s;
        `)}
        whileHover={{ borderColor: 'rgba(221,0,4,0.2)', boxShadow: '0 4px 20px rgba(221,0,4,0.08)' }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: hasValues ? 'var(--red)' : 'var(--muted)', flexShrink: 0 }} />
        CONTEXTO {filledCount > 0 ? `(${filledCount})` : ''}
      </motion.button>
    );
  }

  // Floating expanded panel
  const posStyle: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.x, top: pos.y }
    : { position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)' };

  return (
    <AnimatePresence>
      <motion.div
        ref={dragRef}
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onMouseDown={onMouseDown}
        style={{
          ...posStyle,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: '14px',
          background: 'var(--glass-surface)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.03)',
          cursor: 'grab',
          userSelect: 'none',
          flexWrap: 'wrap',
          maxWidth: 'min(600px, 90vw)',
        }}
      >
        {/* Drag handle */}
        <span style={css('display:flex; flex-direction:column; gap:2px; cursor:grab; padding:2px 4px; opacity:.4; flex-shrink:0')} title="Arrastar">
          <span style={css('width:14px; height:2px; background:var(--muted); border-radius:1px')} />
          <span style={css('width:14px; height:2px; background:var(--muted); border-radius:1px')} />
          <span style={css('width:10px; height:2px; background:var(--muted); border-radius:1px')} />
        </span>

        <span style={css('font-size:9.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-3); flex-shrink:0')}>
          CTX
        </span>

        {chips.map((chip) => (
          <span key={chip.key} data-no-drag>
            {editingKey === chip.key ? (
              <span style={css('display:inline-flex; align-items:center; gap:3px')}>
                {chip.options && chip.options.length > 0 ? (
                  <select
                    autoFocus
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    onBlur={() => { if (editVal) onChipChange(chip.key, editVal); setEditingKey(null); }}
                    onKeyDown={(e) => { if (e.key === 'Escape') setEditingKey(null); }}
                    style={css('padding:3px 6px; border:1px solid var(--red-dim); border-radius:5px; background:var(--bg-input); color:var(--white); font-size:11px; font-family:var(--font-body); outline:none')}
                  >
                    <option value="">—</option>
                    {chip.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    autoFocus
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { onChipChange(chip.key, editVal); setEditingKey(null); } if (e.key === 'Escape') setEditingKey(null); }}
                    onBlur={() => { if (editVal) onChipChange(chip.key, editVal); setEditingKey(null); }}
                    placeholder={chip.label}
                    style={css('padding:3px 6px; border:1px solid var(--red-dim); border-radius:5px; background:var(--bg-input); color:var(--white); font-size:11px; font-family:var(--font-body); outline:none; width:100px')}
                  />
                )}
              </span>
            ) : (
              <span
                onClick={() => { setEditingKey(chip.key); setEditVal(chip.value); }}
                style={chipStyle(!!chip.value)}
              >
                <span style={css('font-size:9px; color:var(--fg-3); text-transform:uppercase; letter-spacing:.04em')}>{chip.label}</span>
                <span>{chip.value || '—'}</span>
                {chip.value && (
                  <span
                    onClick={(e) => { e.stopPropagation(); onChipChange(chip.key, ''); }}
                    style={css('font-size:11px; color:var(--fg-3); cursor:pointer; margin-left:1px; transition:color .15s; line-height:1')}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-3)'; }}
                  >×</span>
                )}
              </span>
            )}
          </span>
        ))}

        {hasValues && (
          <button
            data-no-drag
            onClick={onClearAll}
            style={css('background:none; border:none; color:var(--fg-3); cursor:pointer; font-size:10px; font-family:var(--font-body); padding:3px 6px; transition:color .2s')}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-3)'; }}
          >
            Limpar
          </button>
        )}

        {/* Close / minimize button */}
        <button
          data-no-drag
          onClick={() => setExpanded(false)}
          title="Minimizar contexto"
          style={css('background:none; border:none; color:var(--fg-3); cursor:pointer; padding:2px 4px; font-size:14px; line-height:1; transition:color .15s; flex-shrink:0')}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--white)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-3)'; }}
        >
          ×
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
