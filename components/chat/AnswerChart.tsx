'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { IC, css } from '@/lib/dc';
import type { ParsedTable } from '@/lib/types';

/** Converte número pt-BR ("R$ 41.180,58", "9,4%") em Number. */
export function toNum(s: string): number {
  const cleaned = String(s || '').replace(/[^\d,.-]/g, '');
  if (!cleaned) return NaN;
  return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
}

/** Remove formatação markdown (bold, italic, strikethrough, code). */
export function stripMd(s: string): string {
  return String(s || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim();
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

      let labelCol = 0;
      const LABEL_HEADERS = /^(ve[ií]culo|nome|canal|programa|emissor[a]?|meio|pra[çc]a|cidade|estado|uf|regi[aã]o|marca|produto|categoria|descri[çc][aã]o|tipo|segmento|fonte|plataforma|rede|item|label|name|title)/i;
      for (let c = 0; c < headers.length; c++) {
        if (c !== valueCol && LABEL_HEADERS.test(stripMd(headers[c]).trim())) {
          labelCol = c;
          break;
        }
      }

      if (labelCol === 0 && headers.length >= 3) {
        const col0AllNumeric = rows.every(r => /^\d+$/.test((r[0] || '').trim()));
        if (col0AllNumeric) {
          for (let c = 1; c < headers.length; c++) {
            if (c === valueCol) continue;
            const hasText = rows.some(r => {
              const v = (r[c] || '').trim();
              return v.length > 0 && !/^[\d.,R$%\s-]+$/.test(v);
            });
            if (hasText) { labelCol = c; break; }
          }
          if (labelCol === 0 && valueCol !== 1) {
            labelCol = 1;
          }
        }
      }

      return { headers, rows, labelCol, valueCol };
    }
  }
  return null;
}

// ============================================================================
// INTELIGÊNCIA DE CORES — escolhe paleta baseado na natureza dos dados
// ============================================================================

type ColorScheme = 'sequential' | 'categorical';

/** Detecta se as labels representam categorias distintas ou ranking sequencial. */
function detectColorScheme(rows: string[][], labelCol: number, valueCol: number): ColorScheme {
  const labels = rows.map(r => stripMd(r[labelCol]).toLowerCase());
  
  // Se labels são TODAS do mesmo tipo (ex: TV GLOBO X, TV GLOBO Y) → sequential
  // Se labels são categorias distintas (TV, Rádio, Digital, OOH) → categorical
  
  // Heurística 1: Se dados estão ordenados (monotonicamente decrescente/crescente) → ranking → sequential
  const vals = rows.map(r => toNum(r[valueCol])).filter(v => !Number.isNaN(v));
  if (vals.length >= 3) {
    let ascending = true, descending = true;
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] > vals[i - 1]) descending = false;
      if (vals[i] < vals[i - 1]) ascending = false;
    }
    if (ascending || descending) return 'sequential';
  }

  // Heurística 2: Se tem muitos itens (>8), provavelmente é ranking → sequential
  if (rows.length > 8) return 'sequential';
  
  // Heurística 3: Se labels compartilham prefixo comum → sequential
  if (labels.length >= 3) {
    const firstWords = labels.map(l => l.split(/[\s-]/)[0]);
    const mode = firstWords.sort().reduce<{val: string; count: number; max: number; maxVal: string}>((acc, w) => {
      if (w === acc.val) acc.count++;
      else acc.count = 1;
      acc.val = w;
      if (acc.count > acc.max) { acc.max = acc.count; acc.maxVal = w; }
      return acc;
    }, { val: '', count: 0, max: 0, maxVal: '' });
    if (mode.max >= Math.ceil(labels.length * 0.5)) return 'sequential';
  }

  // Default: poucos itens distintos → categorical
  return 'categorical';
}

/** Paleta sequencial — gradiente monocromático vermelho (marca). */
function getSequentialColors(count: number): string[] {
  // Do vermelho escuro ao vermelho claro (brand-aligned)
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const ratio = count <= 1 ? 0.5 : i / (count - 1);
    // HSL: hue=6 (vermelho marca), saturation 70-85%, lightness 30-65%
    const s = 75 + ratio * 10;
    const l = 35 + ratio * 30;
    colors.push(`hsl(6, ${s}%, ${l}%)`);
  }
  return colors;
}

/** Paleta categórica — cores distintas, elegantes. */
const CATEGORICAL_COLORS = [
  '#C41E1E', // vermelho marca
  '#50C878', // verde esmeralda
  '#F5A623', // laranja
  '#9B59B6', // roxo
  '#1ABC9C', // turquesa
  '#E74C8B', // rosa
  '#2ECC71', // verde limão
  '#3498DB', // azul claro
  '#E67E22', // tangerina
  '#8E44AD', // roxo escuro
  '#16A085', // verde-azulado
  '#F39C12', // dourado
];

function getColors(scheme: ColorScheme, count: number): string[] {
  if (scheme === 'sequential') return getSequentialColors(count);
  return CATEGORICAL_COLORS;
}

// ============================================================================
// DETECÇÃO DE TIPO DE GRÁFICO
// ============================================================================

type ChartType = 'bar' | 'horizontal' | 'pie' | 'line';

function isTemporal(labels: string[]): boolean {
  const months = /^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i;
  const yearMonth = /^\d{4}[\/-]\d{1,2}$/;
  const datePattern = /^\d{1,2}[\/-]\d{1,2}([\/-]\d{2,4})?$/;
  const yearOnly = /^20\d{2}$/;
  const monthYear = /^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*[\s\/.-]?\d{2,4}$/i;
  let temporalCount = 0;
  for (const l of labels) {
    const t = l.trim();
    if (months.test(t) || yearMonth.test(t) || datePattern.test(t) || yearOnly.test(t) || monthYear.test(t)) temporalCount++;
  }
  return temporalCount >= Math.ceil(labels.length * 0.6);
}

function detectChartType(rows: string[][], labelCol: number, valueCol: number): ChartType {
  const vals = rows.map((r) => toNum(r[valueCol])).filter((v) => !Number.isNaN(v));
  const allPositive = vals.every((v) => v >= 0);
  const isPercentage = rows.some((r) => r[valueCol].includes('%'));
  const totalApprox100 = allPositive && Math.abs(vals.reduce((a, b) => a + b, 0) - 100) < 5;
  const labels = rows.map(r => stripMd(r[labelCol]));

  if (isTemporal(labels) && rows.length >= 3) return 'line';
  if (isPercentage && totalApprox100 && rows.length <= 8) return 'pie';
  if (allPositive && rows.length <= 5 && rows.length >= 2) return 'pie';
  if (labels.some((l) => l.length > 20) || rows.length > 8) return 'horizontal';
  return 'bar';
}

// ============================================================================
// COMPONENTES DE GRÁFICO COM ANIMAÇÃO
// ============================================================================

interface AnswerChartProps {
  table: ParsedTable;
  on: boolean;
  onToggle: () => void;
}

/** Hook para animação de entrada — delay staggered. */
function useStaggeredReveal(count: number, on: boolean) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (on) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [on]);
  return visible;
}

// ── Bar Chart (vertical) — SVG premium com hover tooltip ──
function BarChart({ bars, max, colors }: { bars: Bar[]; max: number; colors: string[] }) {
  const [animated, setAnimated] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t); }, []);

  const barWidth = Math.max(16, Math.min(36, 500 / bars.length - 6));
  const gap = Math.max(4, Math.min(12, 300 / bars.length));
  const w = Math.max(400, bars.length * (barWidth + gap) + 100);
  const h = 240, padX = 55, padY = 24, padBottom = 56;
  const plotW = w - padX - 20, plotH = h - padY - padBottom;

  const formatVal = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return v.toFixed(0);
  };

  return (
    <div style={css('overflow-x:auto')}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: w, height: 'auto' }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = padY + plotH * (1 - pct);
          return (
            <g key={i}>
              <line x1={padX} y1={y} x2={w - 20} y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" opacity={0.5} />
              <text x={padX - 8} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">
                {formatVal(max * pct)}
              </text>
            </g>
          );
        })}
        {/* Bars */}
        {bars.map((b, i) => {
          const barH = max > 0 ? (Math.abs(b.val) / max) * plotH : 2;
          const x = padX + i * (barWidth + gap) + gap / 2;
          const y = padY + plotH - barH;
          const color = colors[i % colors.length];
          const isHovered = hoverIdx === i;
          const showLabel = bars.length <= 14 || i % Math.ceil(bars.length / 14) === 0 || i === bars.length - 1;
          return (
            <g key={i} onMouseEnter={() => setHoverIdx(i)} style={{ cursor: 'pointer' }}>
              {/* Bar */}
              <rect
                x={x} y={animated ? y : padY + plotH}
                width={barWidth} height={animated ? Math.max(2, barH) : 0}
                rx={4} ry={4}
                fill={color}
                opacity={isHovered ? 1 : 0.85}
                style={{ transition: `y 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.04}s, height 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.04}s, opacity 0.15s ease` }}
              />
              {/* Glow on hover */}
              {isHovered && (
                <rect x={x - 1} y={y - 1} width={barWidth + 2} height={Math.max(2, barH) + 2} rx={5} fill="none" stroke={color} strokeWidth="1.5" opacity={0.5} />
              )}
              {/* Hover tooltip */}
              {isHovered && (
                <g>
                  <rect x={x + barWidth / 2 - 55} y={y - 30} width={110} height={22} rx={6}
                    fill="var(--bg-surface)" stroke="var(--border)" strokeWidth="0.5" />
                  <text x={x + barWidth / 2} y={y - 15} textAnchor="middle" fill="var(--fg-1)" fontSize="10.5" fontFamily="var(--font-mono)" fontWeight="600">
                    {b.raw}
                  </text>
                </g>
              )}
              {/* X-axis label — rotated */}
              {showLabel && (
                <text
                  x={x + barWidth / 2} y={padY + plotH + 14}
                  textAnchor="end" fill="var(--muted-dim)" fontSize="9" fontFamily="var(--font-body)"
                  transform={`rotate(-45, ${x + barWidth / 2}, ${padY + plotH + 14})`}
                >
                  {b.label.length > 16 ? b.label.slice(0, 15) + '…' : b.label}
                </text>
              )}
              <title>{`${b.label}: ${b.raw}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Horizontal Bar Chart com animação ──
function HorizontalChart({ bars, max, colors }: { bars: Bar[]; max: number; colors: string[] }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t); }, []);

  const maxLabelLen = Math.max(...bars.map(b => b.label.length));
  const labelWidth = Math.min(220, Math.max(100, maxLabelLen * 7 + 20));

  return (
    <div style={css('display:flex; flex-direction:column; gap:6px')}>
      {bars.map((b, i) => {
        const pct = max > 0 ? Math.max(2, Math.round((Math.abs(b.val) / max) * 100)) : 2;
        const isSmall = pct < 25;
        const barColor = colors[i % colors.length];

        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '3px 0',
            transition: 'background .15s ease',
            borderRadius: 6,
            opacity: animated ? 1 : 0,
            transform: animated ? 'translateX(0)' : 'translateX(-10px)',
            transitionDelay: `${i * 0.03}s`,
            transitionProperty: 'opacity, transform, background',
            transitionDuration: '0.4s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.03)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{
              fontSize: 12, color: 'var(--fg-2)',
              width: labelWidth, minWidth: labelWidth, maxWidth: labelWidth,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textAlign: 'right', flexShrink: 0,
              fontFamily: 'var(--font-body)', fontWeight: 500,
            }} title={b.label}>
              {b.label}
            </span>

            <div style={{
              flex: 1, height: 28,
              background: 'var(--bg-surface)',
              borderRadius: 8, overflow: 'visible',
              position: 'relative',
              display: 'flex', alignItems: 'center',
            }}>
              <div
                title={`${b.label}: ${b.raw}`}
                style={{
                  height: '100%',
                  width: animated ? `${pct}%` : '0%',
                  borderRadius: 8,
                  background: `linear-gradient(90deg, ${barColor}, ${barColor}dd)`,
                  transition: `width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.04}s`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: isSmall ? 0 : 10,
                  boxShadow: `0 2px 8px ${barColor}30`,
                }}
              >
                {!isSmall && (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11, color: '#fff', fontWeight: 600,
                    textShadow: '0 1px 2px rgba(0,0,0,.3)',
                    whiteSpace: 'nowrap',
                  }}>{b.raw}</span>
                )}
              </div>

              {isSmall && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11, color: 'var(--muted-light)', fontWeight: 500,
                  marginLeft: 8, whiteSpace: 'nowrap',
                }}>{b.raw}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Donut Chart premium com hover highlight ──
function PieChart({ bars, total, colors }: { bars: Bar[]; total: number; colors: string[] }) {
  const [animated, setAnimated] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t); }, []);

  const formatTotal = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return v.toFixed(0);
  };

  const segments = useMemo(() => {
    let cumulative = 0;
    const segs = bars.map((b, i) => {
      const pct = total > 0 ? (Math.abs(b.val) / total) * 100 : 0;
      const start = cumulative;
      cumulative += pct;
      return { ...b, pct, start, color: colors[i % colors.length] };
    });
    if (segs.length > 0 && cumulative > 0 && cumulative < 100.5) {
      const last = segs[segs.length - 1];
      last.pct += (100 - cumulative);
    }
    return segs;
  }, [bars, total, colors]);

  const size = 220;
  const cx = size / 2, cy = size / 2;
  const outerR = 90, innerR = 55; // Donut

  function donutArc(startPct: number, endPct: number, hover: boolean) {
    const sP = Math.max(0, Math.min(100, startPct));
    const eP = Math.max(0, Math.min(100, endPct));
    const r = hover ? outerR + 4 : outerR;
    const ir = hover ? innerR - 2 : innerR;
    if (eP - sP >= 99.99) {
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy - r} Z M ${cx} ${cy - ir} A ${ir} ${ir} 0 1 0 ${cx - 0.01} ${cy - ir} A ${ir} ${ir} 0 0 0 ${cx} ${cy - ir} Z`;
    }
    const s1 = ((sP / 100) * 360 - 90) * Math.PI / 180;
    const e1 = ((eP / 100) * 360 - 90) * Math.PI / 180;
    const la = (eP - sP) > 50 ? 1 : 0;
    const ox1 = cx + r * Math.cos(s1), oy1 = cy + r * Math.sin(s1);
    const ox2 = cx + r * Math.cos(e1), oy2 = cy + r * Math.sin(e1);
    const ix1 = cx + ir * Math.cos(e1), iy1 = cy + ir * Math.sin(e1);
    const ix2 = cx + ir * Math.cos(s1), iy2 = cy + ir * Math.sin(s1);
    return `M ${ox1} ${oy1} A ${r} ${r} 0 ${la} 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${la} 0 ${ix2} ${iy2} Z`;
  }

  const hoverSeg = hoverIdx !== null ? segments[hoverIdx] : null;

  return (
    <div style={{
      ...css('display:flex; align-items:center; gap:28px; flex-wrap:wrap; justify-content:center') as any,
      opacity: animated ? 1 : 0,
      transform: animated ? 'scale(1)' : 'scale(0.85)',
      transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none" stroke="var(--bg-surface)" strokeWidth={outerR - innerR} />
        {/* Segments */}
        {segments.map((seg, i) => (
          <path
            key={i}
            d={donutArc(seg.start, seg.start + seg.pct, hoverIdx === i)}
            fill={seg.color}
            fillRule="evenodd"
            stroke="var(--bg-card)"
            strokeWidth="1.5"
            onMouseEnter={() => setHoverIdx(i)}
            style={{
              opacity: animated ? (hoverIdx !== null && hoverIdx !== i ? 0.5 : 1) : 0,
              transition: `opacity 0.25s ease ${i * 0.05}s, d 0.2s ease`,
              cursor: 'pointer',
              filter: hoverIdx === i ? `drop-shadow(0 2px 8px ${seg.color}66)` : 'none',
            }}
          >
            <title>{`${seg.label}: ${seg.raw} (${seg.pct.toFixed(1)}%)`}</title>
          </path>
        ))}
        {/* Center label */}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--fg-1)" fontSize="16" fontFamily="var(--font-mono)" fontWeight="700">
          {hoverSeg ? `${hoverSeg.pct.toFixed(1)}%` : formatTotal(total)}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--muted)" fontSize="9" fontFamily="var(--font-body)">
          {hoverSeg ? (hoverSeg.label.length > 18 ? hoverSeg.label.slice(0, 17) + '…' : hoverSeg.label) : 'Total'}
        </text>
      </svg>
      {/* Legend */}
      <div style={css('display:flex; flex-direction:column; gap:4px; max-height:220px; overflow-y:auto; padding-right:4px')}>
        {segments.map((seg, i) => (
          <div key={i}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '3px 6px',
              borderRadius: 6, cursor: 'pointer',
              background: hoverIdx === i ? 'rgba(255,255,255,.05)' : 'transparent',
              transition: 'background 0.15s ease',
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0,
              boxShadow: hoverIdx === i ? `0 0 6px ${seg.color}88` : 'none' }} />
            <span style={css('font-size:11px; color:var(--muted-light); max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap')}
              title={seg.label}
            >{seg.label}</span>
            <span style={css('font-family:var(--font-mono); font-size:10px; color:var(--muted); white-space:nowrap; margin-left:auto')}>
              {seg.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Line Chart com animação ──
function LineChart({ bars, max, min, colors }: { bars: Bar[]; max: number; min: number; colors: string[] }) {
  const [animated, setAnimated] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t); }, []);

  const lineColor = colors[0] || '#C41E1E';
  // Dynamic width: wider for more points so labels don't overlap
  const pointSpacing = Math.max(50, Math.min(80, 600 / bars.length));
  const w = Math.max(500, bars.length * pointSpacing + 100);
  const h = 220, padX = 60, padY = 30, padBottom = 60;
  const plotW = w - padX * 2, plotH = h - padY - padBottom;
  const range = Math.max(1, max - min);

  // Smart Y-axis formatting
  const formatVal = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return v.toFixed(0);
  };

  const points = bars.map((b, i) => ({
    x: padX + (bars.length > 1 ? (i / (bars.length - 1)) * plotW : plotW / 2),
    y: padY + plotH - ((b.val - min) / range) * plotH,
    ...b,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${h - padBottom} L ${points[0].x} ${h - padBottom} Z`;
  const pathLength = 1200;

  return (
    <div style={css('overflow-x:auto')}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: w, height: 'auto' }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Y-axis grid lines + labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = padY + plotH * (1 - pct);
          const val = min + range * pct;
          return (
            <g key={i}>
              <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
              <text x={padX - 8} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">
                {formatVal(val)}
              </text>
            </g>
          );
        })}
        {/* Area fill */}
        <path d={areaPath} fill={`${lineColor}12`} style={{ opacity: animated ? 1 : 0, transition: 'opacity 0.8s ease 0.5s' }} />
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={pathLength}
          strokeDashoffset={animated ? 0 : pathLength}
          style={{ transition: `stroke-dashoffset 1.2s ease-out` }}
        />
        {/* Data points + X labels */}
        {points.map((p, i) => {
          const isHovered = hoverIdx === i;
          // Show label for every Nth point to avoid crowding
          const showLabel = bars.length <= 12 || i % Math.ceil(bars.length / 12) === 0 || i === bars.length - 1;
          return (
            <g key={i}
              style={{ opacity: animated ? 1 : 0, transition: `opacity 0.3s ease ${0.3 + i * 0.05}s` }}
              onMouseEnter={() => setHoverIdx(i)}
            >
              {/* Hover vertical guide line */}
              {isHovered && (
                <line x1={p.x} y1={padY} x2={p.x} y2={h - padBottom} stroke="var(--muted)" strokeWidth="0.5" strokeDasharray="4,4" />
              )}
              {/* Hover tooltip — value shown only on hover */}
              {isHovered && (
                <g>
                  <rect
                    x={p.x - 50} y={p.y - 28} width={100} height={20} rx={6}
                    fill="var(--bg-surface)" stroke="var(--border)" strokeWidth="0.5"
                  />
                  <text x={p.x} y={p.y - 14} textAnchor="middle" fill="var(--fg-1)" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">
                    {p.raw}
                  </text>
                </g>
              )}
              {/* Circle point */}
              <circle cx={p.x} cy={p.y} r={isHovered ? 6 : 4} fill={lineColor} stroke="var(--bg-card)" strokeWidth="2" style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}>
                <title>{`${p.label}: ${p.raw}`}</title>
              </circle>
              {/* X-axis label — rotated 45deg for readability */}
              {showLabel && (
                <text
                  x={p.x} y={h - padBottom + 14}
                  textAnchor="end" fill="var(--muted-dim)" fontSize="9.5" fontFamily="var(--font-body)"
                  transform={`rotate(-45, ${p.x}, ${h - padBottom + 14})`}
                >
                  {p.label.length > 14 ? p.label.slice(0, 13) + '…' : p.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

type Bar = { label: string; raw: string; val: number };

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: 'Barras',
  horizontal: 'Horizontal',
  pie: 'Pizza',
  line: 'Linha',
};
const CHART_TYPE_ICONS: Record<ChartType, string> = {
  bar: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  horizontal: '<line x1="4" y1="6" x2="14" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="10" y2="18"/>',
  pie: '<circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10H12V2z"/>',
  line: '<polyline points="4 18 8 14 12 16 16 10 20 6"/>',
};

export function AnswerChart({ table, on, onToggle }: AnswerChartProps) {
  const { headers, rows, labelCol, valueCol } = table;
  const vals = rows.map((r) => toNum(r[valueCol]));
  const max = Math.max(1, ...vals.map((v) => (Number.isNaN(v) ? 0 : Math.abs(v))));
  const total = vals.filter((v) => !Number.isNaN(v)).reduce((a, b) => a + Math.abs(b), 0);
  const min = Math.min(0, ...vals.map((v) => (Number.isNaN(v) ? 0 : v)));
  const bars: Bar[] = rows.slice(0, 20).map((r, i) => ({
    label: stripMd(r[labelCol]), raw: stripMd(r[valueCol]),
    val: Number.isNaN(vals[i]) ? 0 : vals[i],
  }));

  const autoType = detectChartType(rows, labelCol, valueCol);
  const [manualType, setManualType] = useState<ChartType | null>(null);
  const chartType = manualType || autoType;

  // Inteligência de cores: esquema muda com o tipo
  const colorScheme = chartType === 'pie' ? 'categorical' : detectColorScheme(rows, labelCol, valueCol);
  const colors = getColors(colorScheme, bars.length);

  return (
    <div style={css('margin-top:8px')}>
      <button onClick={onToggle} style={css(`display:inline-flex; align-items:center; gap:7px; padding:5px 11px; border-radius:8px; border:1px solid ${on ? 'var(--red-dim)' : 'var(--border)'}; background:${on ? 'var(--red-glow)' : 'transparent'}; color:${on ? 'var(--white)' : 'var(--muted-light)'}; font-family:var(--font-body); font-size:11.5px; font-weight:600; cursor:pointer`)}>
        <IC s={12} d='<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' w={2} />
        {on ? 'Ocultar gráfico' : 'Ver em gráfico'}
        <span style={css('font-family:var(--font-body); font-weight:400; color:var(--muted)')}>· {headers[valueCol] || 'valor'}</span>
      </button>
      {on && (
        <div style={css('margin-top:10px; border:1px solid var(--border); border-radius:12px; background:var(--bg-card); padding:18px 20px; overflow-x:auto')}>
          {/* Seletor de tipo + esquema de cores */}
          <div style={css('display:flex; align-items:center; gap:4px; margin-bottom:14px; flex-wrap:wrap')}>
            {(['bar', 'horizontal', 'pie', 'line'] as ChartType[]).map((type) => {
              const isActive = chartType === type;
              const isAuto = type === autoType && !manualType;
              return (
                <button
                  key={type}
                  onClick={() => setManualType(type === autoType ? null : type)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 6,
                    border: `1px solid ${isActive ? 'var(--red-dim)' : 'var(--border)'}`,
                    background: isActive ? 'var(--red-glow)' : 'transparent',
                    color: isActive ? 'var(--white)' : 'var(--muted)',
                    fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 600,
                    cursor: 'pointer', transition: 'all .15s ease',
                  }}
                >
                  <IC s={10} d={CHART_TYPE_ICONS[type]} w={1.5} />
                  {CHART_TYPE_LABELS[type]}
                  {isAuto && <span style={{ fontSize: 8, opacity: 0.6 }}>(auto)</span>}
                </button>
              );
            })}
            <span style={css('font-size:9.5px; color:var(--muted-dim); margin-left:6px')}>
              {rows.length > 20 ? `Top 20 de ${rows.length}` : `${rows.length} itens`}
              {' · '}
              {colorScheme === 'sequential' ? '🎨 Gradiente' : '🎨 Categórico'}
            </span>
          </div>
          {chartType === 'line' ? (
            <LineChart bars={bars} max={max} min={min} colors={colors} />
          ) : chartType === 'pie' ? (
            <PieChart bars={bars} total={total} colors={colors} />
          ) : chartType === 'horizontal' ? (
            <HorizontalChart bars={bars} max={max} colors={colors} />
          ) : (
            <BarChart bars={bars} max={max} colors={colors} />
          )}
        </div>
      )}
    </div>
  );
}
