'use client';
import React from 'react';
import { IC, css } from '@/lib/dc';
import type { ParsedTable } from '@/lib/types';

/** Converte número pt-BR ("R$ 41.180,58", "9,4%") em Number. */
export function toNum(s: string): number {
  const cleaned = String(s || '').replace(/[^\d,.-]/g, '');
  if (!cleaned) return NaN;
  return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
}

/** Extrai a primeira tabela GFM do markdown da resposta. */
export function parseTable(md: string): ParsedTable | null {
  const lines = (md || '').split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].includes('|') && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const cut = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      const headers = cut(lines[i]);
      const rows: string[][] = [];
      for (let j = i + 2; j < lines.length; j++) {
        if (!lines[j].includes('|')) break;
        const r = cut(lines[j]);
        if (r.length >= 2) rows.push(r);
      }
      if (rows.length < 2) return null;
      let valueCol = -1;
      for (let c = headers.length - 1; c >= 1; c--) {
        const ok = rows.filter((r) => !Number.isNaN(toNum(r[c]))).length;
        if (ok >= Math.ceil(rows.length * 0.6)) { valueCol = c; break; }
      }
      if (valueCol < 0) return null;
      return { headers, rows, labelCol: 0, valueCol };
    }
  }
  return null;
}

interface AnswerChartProps {
  table: ParsedTable;
  on: boolean;
  onToggle: () => void;
}

/** Gráfico derivado da tabela real da resposta (não inventa nada; lê a própria tabela). */
export function AnswerChart({ table, on, onToggle }: AnswerChartProps) {
  const { headers, rows, labelCol, valueCol } = table;
  const vals = rows.map((r) => toNum(r[valueCol]));
  const max = Math.max(1, ...vals.map((v) => (Number.isNaN(v) ? 0 : Math.abs(v))));
  const bars = rows.slice(0, 12).map((r, i) => ({
    label: r[labelCol], raw: r[valueCol],
    h: Math.max(3, Math.round(((Number.isNaN(vals[i]) ? 0 : Math.abs(vals[i])) / max) * 100)),
  }));
  return (
    <div style={css('margin-top:8px')}>
      <button onClick={onToggle} style={css(`display:inline-flex; align-items:center; gap:7px; padding:5px 11px; border-radius:8px; border:1px solid ${on ? 'var(--red-dim)' : 'var(--border)'}; background:${on ? 'var(--red-glow)' : 'transparent'}; color:${on ? 'var(--white)' : 'var(--muted-light)'}; font-family:var(--font-body); font-size:11.5px; font-weight:600; cursor:pointer`)}>
        <IC s={12} d='<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' w={2} />
        {on ? 'Ocultar gráfico' : 'Ver em gráfico'}
        <span style={css('font-family:var(--font-body); font-weight:400; color:var(--muted)')}>· {headers[valueCol] || 'valor'}</span>
      </button>
      {on && (
        <div style={css('margin-top:10px; border:1px solid var(--border); border-radius:12px; background:var(--bg-card); padding:16px 18px')}>
          <div style={css('display:flex; align-items:stretch; gap:10px; height:170px')}>
            {bars.map((b, i) => (
              <div key={i} style={css('flex:1; height:100%; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; gap:6px; min-width:0')}>
                <span style={css("font-family:var(--font-mono); font-size:10px; color:var(--muted); white-space:nowrap")}>{b.raw}</span>
                <div style={css('width:100%; height:120px; display:flex; align-items:flex-end; justify-content:center')}>
                  <div title={`${b.label}: ${b.raw}`} style={css(`width:100%; max-width:30px; height:${b.h}%; border-radius:5px 5px 0 0; background:linear-gradient(180deg,var(--red),var(--wine))`)} />
                </div>
                <span style={css('font-size:10px; color:var(--muted-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; text-align:center')}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
