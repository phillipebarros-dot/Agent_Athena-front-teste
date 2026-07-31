'use client';
import React, { useState } from 'react';
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
  display:inline-flex; align-items:center; gap:6px; padding:5px 12px;
  border-radius:8px; font-size:12px; font-weight:600;
  cursor:pointer; transition:all .2s;
  border:1px solid ${active ? 'var(--red-dim)' : 'var(--border)'};
  background:${active ? 'rgba(196,30,30,.08)' : 'var(--bg-surface)'};
  color:${active ? 'var(--white)' : 'var(--fg-3)'};
`);

export function ContextBar({ chips, onChipChange, onClearAll }: ContextBarProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const hasValues = chips.some(c => c.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={css('display:flex; align-items:center; gap:8px; padding:8px 24px; border-bottom:1px solid var(--border); background:var(--bg-surface); flex-shrink:0; flex-wrap:wrap; min-height:42px')}
    >
      <span style={css('font-size:10.5px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--fg-3); flex-shrink:0')}>
        CONTEXTO
      </span>

      {chips.map((chip) => (
        <AnimatePresence key={chip.key} mode="wait">
          {editingKey === chip.key ? (
            <motion.span
              key="edit"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              style={css('display:inline-flex; align-items:center; gap:4px')}
            >
              {chip.options && chip.options.length > 0 ? (
                <select
                  autoFocus
                  value={editVal}
                  onChange={(e) => { setEditVal(e.target.value); }}
                  onBlur={() => { if (editVal) onChipChange(chip.key, editVal); setEditingKey(null); }}
                  style={css('padding:4px 8px; border:1px solid var(--red-dim); border-radius:6px; background:var(--bg-input); color:var(--white); font-size:12px; font-family:var(--font-body); outline:none')}
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
                  style={css('padding:4px 8px; border:1px solid var(--red-dim); border-radius:6px; background:var(--bg-input); color:var(--white); font-size:12px; font-family:var(--font-body); outline:none; width:120px')}
                />
              )}
            </motion.span>
          ) : (
            <motion.span
              key="chip"
              onClick={() => { setEditingKey(chip.key); setEditVal(chip.value); }}
              style={chipStyle(!!chip.value)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span style={css('font-size:10px; color:var(--fg-3)')}>{chip.label}:</span>
              <span>{chip.value || '—'}</span>
              {chip.value && (
                <span
                  onClick={(e) => { e.stopPropagation(); onChipChange(chip.key, ''); }}
                  style={css('font-size:12px; color:var(--fg-3); cursor:pointer; margin-left:2px; transition:color .15s')}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-3)'; }}
                >×</span>
              )}
            </motion.span>
          )}
        </AnimatePresence>
      ))}

      {hasValues && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onClearAll}
          style={css('background:none; border:none; color:var(--fg-3); cursor:pointer; font-size:11px; font-family:var(--font-body); padding:4px 8px; transition:color .2s')}
          whileHover={{ color: 'var(--red)' }}
        >
          Limpar
        </motion.button>
      )}
    </motion.div>
  );
}
