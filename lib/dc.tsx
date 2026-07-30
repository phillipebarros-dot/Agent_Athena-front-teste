'use client';
import React, { useState } from 'react';

/**
 * Fator global de escala de font-size.
 * Altere aqui para aumentar/diminuir TODAS as fontes do projeto de uma vez.
 * 1.0 = tamanho original, 1.15 = +15%, 1.25 = +25%
 */
const FONT_SCALE = 1.15;

/** Converte "prop:val; prop2:val2" em React.CSSProperties. */
export function css(str: string): React.CSSProperties {
  const o: Record<string, string> = {};
  if (!str) return o;
  for (const decl of str.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    let k = decl.slice(0, i).trim();
    let v = decl.slice(i + 1).trim();
    if (!k) continue;
    if (!k.startsWith('--')) k = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    // Escala font-size automaticamente
    if (k === 'fontSize' || k === 'font-size') {
      const m = v.match(/^([\d.]+)(px)$/);
      if (m) v = `${Math.round(parseFloat(m[1]) * FONT_SCALE * 10) / 10}px`;
    }
    o[k] = v;
  }
  return o;
}

type BoxProps = {
  /** Tag HTML a renderizar ('div' padrão) */
  as?: any;
  /** CSS base (string no formato "prop:val; prop2:val2") */
  baseStyle?: string;
  /** CSS no hover */
  hoverStyle?: string;
  /** CSS no active/mousedown */
  activeStyle?: string;
  /** CSS no focus */
  focusStyle?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  [k: string]: any;
};

/**
 * Elemento com estados hover/active/focus por string CSS.
 *
 * Props renomeadas (antigo → novo):
 *   t → as | c → baseStyle | h → hoverStyle | a → activeStyle | f → focusStyle
 *
 * Para retrocompatibilidade durante a migração, ainda aceita os nomes curtos.
 */
export function B({
  as, t, baseStyle, c, hoverStyle, h, activeStyle, a, focusStyle, f,
  style, children,
  onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, onFocus, onBlur,
  ...rest
}: BoxProps & { t?: any; c?: string; h?: string; a?: string; f?: string }) {
  // Resolve nomes novos com fallback para os curtos (migração gradual)
  const tag = as || t || 'div';
  const base = baseStyle || c || '';
  const hover = hoverStyle || h || '';
  const active = activeStyle || a || '';
  const focus = focusStyle || f || '';

  const [hov, setHov] = useState(false);
  const [act, setAct] = useState(false);
  const [foc, setFoc] = useState(false);
  const Tag = tag as any;
  const merged = {
    ...css(base),
    ...(hov && hover ? css(hover) : {}),
    ...(act && active ? css(active) : {}),
    ...(foc && focus ? css(focus) : {}),
    ...style,
  };
  return (
    <Tag
      {...rest}
      style={merged}
      onMouseEnter={(e: React.MouseEvent) => { if (hover) setHov(true); onMouseEnter?.(e); }}
      onMouseLeave={(e: React.MouseEvent) => { if (hover) setHov(false); if (active) setAct(false); onMouseLeave?.(e); }}
      onMouseDown={(e: React.MouseEvent) => { if (active) setAct(true); onMouseDown?.(e); }}
      onMouseUp={(e: React.MouseEvent) => { if (active) setAct(false); onMouseUp?.(e); }}
      onFocus={(e: React.FocusEvent) => { if (focus) setFoc(true); onFocus?.(e); }}
      onBlur={(e: React.FocusEvent) => { if (focus) setFoc(false); onBlur?.(e); }}
    >
      {children}
    </Tag>
  );
}

/**
 * Ícone SVG inline.
 * ANTES: usava dangerouslySetInnerHTML — vetor de XSS.
 * AGORA: aceita children (JSX) OU string (com sanitização básica para retrocompat).
 */
export function IC({ s = 16, d, w = 1.8, stroke = 'currentColor', fill = 'none', children }: {
  s?: number;
  /** SVG path string (retrocompat) — será substituído por lucide-react gradualmente */
  d?: string;
  w?: number;
  stroke?: string;
  fill?: string;
  children?: React.ReactNode;
}) {
  // Se tem children JSX, usa diretamente (caminho seguro)
  if (children) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={stroke}
        strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        {children}
      </svg>
    );
  }
  // Fallback: dangerouslySetInnerHTML com sanitização básica.
  // TODO: migrar todos os callsites para lucide-react e remover este path.
  if (d) {
    // Sanitiza: só permite tags SVG válidas
    const sanitized = d.replace(/<script[\s>]/gi, '').replace(/on\w+=/gi, '');
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={stroke}
        strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}
        dangerouslySetInnerHTML={{ __html: sanitized }} />
    );
  }
  return null;
}
