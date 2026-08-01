'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Composer animado da tela de nova conversa. Marca da Athena (preto + vermelho),
 * sem travessoes. Chama onSend(texto). Os atalhos (prompts) preenchem e enviam.
 */
export function AnimatedComposer({ onSend, prompts = [], disabled, userName }: {
  onSend: (text: string) => void;
  prompts?: string[];
  disabled?: boolean;
  userName?: string;
}) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLTextAreaElement>(null);

  const grow = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '60px';
    el.style.height = Math.max(60, Math.min(el.scrollHeight, 200)) + 'px';
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  function fire(text: string) {
    const t = text.trim();
    if (!t || disabled) return;
    setValue('');
    if (ref.current) ref.current.style.height = '60px';
    onSend(t);
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 660, margin: '0 auto' }}>
      {focused && (
        <motion.div
          aria-hidden
          style={{ position: 'fixed', width: '40rem', height: '40rem', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, opacity: 0.04, background: 'radial-gradient(circle, var(--red) 0%, transparent 70%)', filter: 'blur(80px)' }}
          animate={{ x: mouse.x - 320, y: mouse.y - 320 }}
          transition={{ type: 'spring', damping: 25, stiffness: 150, mass: 0.5 }}
        />
      )}

      <motion.div style={{ position: 'relative', zIndex: 1 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
        {/* Título único "Como posso ajudar hoje?" */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ margin: 0, fontFamily: "'Oswald',sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: 1, background: 'linear-gradient(90deg, var(--white), var(--muted))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            Como posso ajudar hoje{userName ? `, ${userName}` : ''}?
          </motion.h2>
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: '100%', opacity: 1 }} transition={{ delay: 0.35, duration: 0.7 }}
            style={{ height: 1, margin: '12px auto 0', background: 'linear-gradient(90deg, transparent, rgba(196,30,30,.35), transparent)' }} />
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--muted-light)' }}>Digite uma pergunta ou escolha um atalho</motion.p>
        </div>

        {/* Composer box com glassmorphism */}
        <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }}
          style={{
            borderRadius: 18,
            border: '1px solid var(--glass-border)',
            background: 'var(--glass-surface)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            boxShadow: focused
              ? '0 0 0 3px rgba(196,30,30,.1), var(--shadow-lg)'
              : 'var(--shadow-md)',
            transition: 'box-shadow .3s ease, border-color .3s ease',
          }}>
          <div style={{ padding: 18 }}>
            <textarea
              ref={ref}
              value={value}
              disabled={disabled}
              onChange={(e) => { setValue(e.target.value); grow(); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fire(value); } }}
              placeholder={disabled ? 'Backend não conectado' : 'Pergunte sobre investimento, inserções, PIs ou tabelas de preço…'}
              rows={1}
              style={{ width: '100%', minHeight: 60, resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: 'var(--white)', fontFamily: "'Raleway',sans-serif", fontSize: 15, lineHeight: 1.6 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--border-faint)' }}>
            <span style={{ fontSize: 11, color: 'var(--muted-dim)', paddingLeft: 4 }}>Enter envia, Shift+Enter quebra linha</span>
            <motion.button type="button" onClick={() => fire(value)} disabled={disabled || !value.trim()} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, border: 'none', cursor: value.trim() && !disabled ? 'pointer' : 'default', fontFamily: "'Raleway',sans-serif", fontSize: 13, fontWeight: 600, color: value.trim() && !disabled ? '#fff' : 'var(--muted)', background: value.trim() && !disabled ? 'var(--red)' : 'var(--bg-panel)', boxShadow: value.trim() && !disabled ? '0 4px 16px rgba(196,30,30,.35)' : 'none', transition: 'all .2s ease' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
              Enviar
            </motion.button>
          </div>
        </motion.div>

        {/* Suggestion chips — grid 2 colunas alinhado */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
          <AnimatePresence>
            {prompts.map((p, i) => (
              <motion.button key={p} type="button" onClick={() => fire(p)} disabled={disabled}
                initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.4 + i * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
                whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,.3), 0 0 0 1px rgba(221,0,4,.15)' }}
                style={{
                  textAlign: 'left', padding: '12px 16px', borderRadius: 12,
                  border: '1px solid var(--glass-border)',
                  background: 'var(--glass)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: 'var(--muted-light)', fontFamily: "'Raleway',sans-serif", fontSize: 12.5, lineHeight: 1.5,
                  cursor: disabled ? 'default' : 'pointer',
                  transition: 'border-color .2s ease',
                  minHeight: 52,
                  display: 'flex', alignItems: 'center',
                }}>
                {p}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
