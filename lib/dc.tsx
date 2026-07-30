'use client';
import React, { useState } from 'react';

/** Converte "prop:val; prop2:val2" (como nos protótipos) em React.CSSProperties. */
export function css(str: string): React.CSSProperties {
  const o: any = {};
  if (!str) return o;
  for (const decl of str.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    let k = decl.slice(0, i).trim();
    const v = decl.slice(i + 1).trim();
    if (!k) continue;
    if (!k.startsWith('--')) k = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    o[k] = v;
  }
  return o;
}

type BoxProps = {
  t?: any;                 // tag ('div' padrão)
  c?: string;              // css base (string)
  h?: string;              // css :hover
  a?: string;              // css :active
  f?: string;              // css :focus
  style?: React.CSSProperties;
  children?: React.ReactNode;
  [k: string]: any;
};

/** Elemento com estados hover/active/focus por string CSS, porta os style-hover dos protótipos. */
export function B({ t = 'div', c, h, a, f, style, children, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, onFocus, onBlur, ...rest }: BoxProps) {
  const [hov, setHov] = useState(false);
  const [act, setAct] = useState(false);
  const [foc, setFoc] = useState(false);
  const Tag = t as any;
  const merged = {
    ...css(c || ''),
    ...(hov && h ? css(h) : {}),
    ...(act && a ? css(a) : {}),
    ...(foc && f ? css(f) : {}),
    ...style,
  };
  return (
    <Tag
      {...rest}
      style={merged}
      onMouseEnter={(e: any) => { if (h) setHov(true); onMouseEnter?.(e); }}
      onMouseLeave={(e: any) => { if (h) setHov(false); if (a) setAct(false); onMouseLeave?.(e); }}
      onMouseDown={(e: any) => { if (a) setAct(true); onMouseDown?.(e); }}
      onMouseUp={(e: any) => { if (a) setAct(false); onMouseUp?.(e); }}
      onFocus={(e: any) => { if (f) setFoc(true); onFocus?.(e); }}
      onBlur={(e: any) => { if (f) setFoc(false); onBlur?.(e); }}
    >
      {children}
    </Tag>
  );
}

/** SVG a partir do markup interno (mesmo padrão dos protótipos DC). */
export function IC({ s = 16, d, w = 1.8, stroke = 'currentColor', fill = 'none' }: { s?: number; d: string; w?: number; stroke?: string; fill?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: d }} />
  );
}
