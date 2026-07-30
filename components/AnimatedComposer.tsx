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
    <div style={{ position: 'relative', width: '100%', maxWidth: 640, margin: '0 auto' }}>
      {focused && (
        <motion.div
          aria-hidden
          style={{ position: 'fixed', width: '40rem', height: '40rem', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, opacity: 0.05, background: 'radial-gradient(circle, var(--red) 0%, transparent 70%)', filter: 'blur(80px)' }}
          animate={{ x: mouse.x - 320, y: mouse.y - 320 }}
          transition={{ type: 'spring', damping: 25, stiffness: 150, mass: 0.5 }}
        />
      )}

      <motion.div style={{ position: 'relative', zIndex: 1 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ margin: 0, fontFamily: "'Oswald',sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 0.5, background: 'linear-gradient(90deg, var(--white), var(--muted))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            Como posso ajudar hoje{userName ? `, ${userName}` : ''}?
          </motion.h2>
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: '100%', opacity: 1 }} transition={{ delay: 0.35, duration: 0.7 }}
            style={{ height: 1, margin: '10px auto 0', background: 'linear-gradient(90deg, transparent, rgba(196,30,30,.4), transparent)' }} />
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--muted-light)' }}>Digite uma pergunta ou escolha um atalho</motion.p>
        </div>

        <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }}
          style={{ borderRadius: 16, border: '1px solid var(--border-subtle)', background: 'var(--bg-input)', boxShadow: focused ? '0 0 0 3px rgba(196,30,30,.12), 0 18px 50px -20px rgba(0,0,0,.8)' : '0 12px 40px -24px rgba(0,0,0,.7)', transition: 'box-shadow .25s' }}>
          <div style={{ padding: 16 }}>
            <textarea
              ref={ref}
              value={value}
              disabled={disabled}
              onChange={(e) => { setValue(e.target.value); grow(); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fire(value); } }}
              placeholder={disabled ? 'Backend nao conectado' : 'Pergunte sobre investimento, insercoes, PIs ou tabelas de preco...'}
              rows={1}
              style={{ width: '100%', minHeight: 60, resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: 'var(--white)', fontFamily: "'Raleway',sans-serif", fontSize: 15, lineHeight: 1.6 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--muted-dim)', paddingLeft: 4 }}>Enter envia, Shift+Enter quebra linha</span>
            <motion.button type="button" onClick={() => fire(value)} disabled={disabled || !value.trim()} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10, border: 'none', cursor: value.trim() && !disabled ? 'pointer' : 'default', fontFamily: "'Raleway',sans-serif", fontSize: 13, fontWeight: 600, color: value.trim() && !disabled ? '#fff' : 'var(--muted)', background: value.trim() && !disabled ? 'var(--red)' : 'var(--bg-panel)', boxShadow: value.trim() && !disabled ? '0 2px 12px rgba(196,30,30,.35)' : 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
              Enviar
            </motion.button>
          </div>
        </motion.div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <AnimatePresence>
            {prompts.map((p, i) => (
              <motion.button key={p} type="button" onClick={() => fire(p)} disabled={disabled}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.08 }}
                whileHover={{ y: -2 }}
                style={{ maxWidth: 300, textAlign: 'left', padding: '9px 13px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--muted-light)', fontFamily: "'Raleway',sans-serif", fontSize: 12.5, lineHeight: 1.45, cursor: disabled ? 'default' : 'pointer' }}>
                {p}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
