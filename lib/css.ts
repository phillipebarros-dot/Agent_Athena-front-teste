import React from 'react';

/**
 * Utilitário para escrever inline styles com sintaxe string-like.
 * Ex: <div style={css('display:flex; align-items:center;')} />
 */
export const css = (s: string): React.CSSProperties => {
  return s.split(';').reduce((acc, rule) => {
    const [key, val] = rule.split(':');
    if (key && val) {
      const camelKey = key.trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
      // Handle custom properties like --foo: bar
      if (key.trim().startsWith('--')) {
        (acc as any)[key.trim()] = val.trim();
      } else {
        acc[camelKey as keyof React.CSSProperties] = val.trim();
      }
    }
    return acc;
  }, {} as React.CSSProperties);
};

export const cx = (...args: (string | undefined | null | false)[]) => {
  return args.filter(Boolean).join(' ');
};
