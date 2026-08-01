'use client';
import React, { useMemo } from 'react';
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
    .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold**
    .replace(/__(.+?)__/g, '$1')       // __bold__
    .replace(/\*(.+?)\*/g, '$1')       // *italic*
    .replace(/_(.+?)_/g, '$1')         // _italic_
    .replace(/~~(.+?)~~/g, '$1')       // ~~strike~~
    .replace(/`(.+?)`/g, '$1')         // `code`
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

      // Detectar coluna de valores numéricos (da direita pra esquerda)
      let valueCol = -1;
      for (let c = headers.length - 1; c >= 1; c--) {
        const ok = rows.filter((r) => !Number.isNaN(toNum(r[c]))).length;
        if (ok >= Math.ceil(rows.length * 0.6)) { valueCol = c; break; }
      }
      if (valueCol < 0) return null;

      // Detectar coluna de label inteligente:
      // Se col 0 é numérica/índice (ex: "1", "2", "3"), usar col 1 como label
      let labelCol = 0;
      if (headers.length >= 3) {
        const col0AllNumeric = rows.every(r => {
          const v = r[0]?.trim();
          return /^\d+$/.test(v); // apenas dígitos puros = índice
        });
        if (col0AllNumeric && valueCol !== 1) {
          labelCol = 1; // pular coluna de índice
        }
      }

      return { headers, rows, labelCol, valueCol };
    }
  }
  return null;
}

// Paleta vibrante com 12 cores distintas
const CHART_COLORS = [
  '#E8453C', // vermelho athena
  '#4A90D9', // azul
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
];

type ChartType = 'bar' | 'horizontal' | 'pie' | 'line';

/** Detecta se labels são temporais (meses, anos, datas). */
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

/** Detecta automaticamente o melhor tipo de gráfico. */
function detectChartType(rows: string[][], valueCol: number): ChartType {
  const vals = rows.map((r) => toNum(r[valueCol])).filter((v) => !Number.isNaN(v));
  const allPositive = vals.every((v) => v >= 0);
  const isPercentage = rows.some((r) => r[valueCol].includes('%'));
  const totalApprox100 = allPositive && Math.abs(vals.reduce((a, b) => a + b, 0) - 100) < 5;
  const labels = rows.map(r => r[0]);

  // Se labels são temporais (meses, anos, datas) → linha
  if (isTemporal(labels) && rows.length >= 3) return 'line';
  // Se parecem percentuais que somam ~100%, pizza
  if (isPercentage && totalApprox100 && rows.length <= 8) return 'pie';
  // Se tem poucos itens e valores positivos, pizza
  if (allPositive && rows.length <= 5 && rows.length >= 2) return 'pie';
  // Se labels são longos, horizontal
  if (rows.some((r) => r[0].length > 20) || rows.length > 8) return 'horizontal';
  return 'bar';
}

interface AnswerChartProps {
  table: ParsedTable;
  on: boolean;
  onToggle: () => void;
}

// ── Bar Chart (vertical) ──
function BarChart({ bars, max }: { bars: { label: string; raw: string; val: number }[]; max: number }) {
  return (
    <div style={css('display:flex; align-items:stretch; gap:10px; height:180px')}>
      {bars.map((b, i) => (
        <div key={i} style={css('flex:1; height:100%; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; gap:5px; min-width:0')}>
          <span style={css("font-family:var(--font-mono); font-size:10px; color:var(--muted); white-space:nowrap")}>{b.raw}</span>
          <div style={css('width:100%; height:130px; display:flex; align-items:flex-end; justify-content:center')}>
            <div
              title={`${b.label}: ${b.raw}`}
              style={{
                width: '100%',
                maxWidth: '36px',
                height: `${Math.max(4, Math.round((Math.abs(b.val) / max) * 100))}%`,
                borderRadius: '6px 6px 2px 2px',
                background: CHART_COLORS[i % CHART_COLORS.length],
                transition: 'height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: `0 2px 8px ${CHART_COLORS[i % CHART_COLORS.length]}40`,
              }}
            />
          </div>
          <span style={css('font-size:9.5px; color:var(--muted-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; text-align:center')}>{b.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Horizontal Bar Chart (premium redesign) ──
function HorizontalChart({ bars, max }: { bars: { label: string; raw: string; val: number }[]; max: number }) {
  // Calcula largura max das labels (adapta ao conteudo)
  const maxLabelLen = Math.max(...bars.map(b => b.label.length));
  const labelWidth = Math.min(220, Math.max(100, maxLabelLen * 7 + 20));

  return (
    <div style={css('display:flex; flex-direction:column; gap:6px')}>
      {bars.map((b, i) => {
        const pct = max > 0 ? Math.max(2, Math.round((Math.abs(b.val) / max) * 100)) : 2;
        const isSmall = pct < 25;
        // Gradient suave vermelho Athena → tons mais claros por posição
        const hue = 4; // vermelho
        const sat = 75 - (i * 2);
        const light = 48 + (i * 1.5);
        const barColor = `hsl(${hue}, ${Math.max(sat, 55)}%, ${Math.min(light, 62)}%)`;

        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '3px 0',
            transition: 'background .15s ease',
            borderRadius: 6,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.03)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Label */}
            <span style={{
              fontSize: 12, color: 'var(--fg-2)',
              width: labelWidth, minWidth: labelWidth, maxWidth: labelWidth,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textAlign: 'right', flexShrink: 0,
              fontFamily: 'var(--font-body)', fontWeight: 500,
            }} title={b.label}>
              {b.label}
            </span>

            {/* Bar container */}
            <div style={{
              flex: 1, height: 28,
              background: 'var(--bg-surface)',
              borderRadius: 8, overflow: 'visible',
              position: 'relative',
              display: 'flex', alignItems: 'center',
            }}>
              {/* Bar fill */}
              <div
                title={`${b.label}: ${b.raw}`}
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  borderRadius: 8,
                  background: `linear-gradient(90deg, ${barColor}, ${barColor}dd)`,
                  transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: isSmall ? 0 : 10,
                  boxShadow: `0 2px 8px ${barColor}30`,
                }}
              >
                {/* Value inside bar (only when bar is wide enough) */}
                {!isSmall && (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11, color: '#fff', fontWeight: 600,
                    textShadow: '0 1px 2px rgba(0,0,0,.3)',
                    whiteSpace: 'nowrap',
                  }}>{b.raw}</span>
                )}
              </div>

              {/* Value outside bar (when bar is too small) */}
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

// ── Pie Chart ──
function PieChart({ bars, total }: { bars: { label: string; raw: string; val: number }[]; total: number }) {
  const segments = useMemo(() => {
    let cumulative = 0;
    return bars.map((b, i) => {
      const pct = total > 0 ? (Math.abs(b.val) / total) * 100 : 0;
      const start = cumulative;
      cumulative += pct;
      return { ...b, pct, start, color: CHART_COLORS[i % CHART_COLORS.length] };
    });
  }, [bars, total]);

  // SVG conic gradient via multiple arcs
  const size = 160;
  const cx = size / 2, cy = size / 2, r = 60;

  function arcPath(startPct: number, endPct: number) {
    const startAngle = (startPct / 100) * 360 - 90;
    const endAngle = (endPct / 100) * 360 - 90;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = endPct - startPct > 50 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  return (
    <div style={css('display:flex; align-items:center; gap:24px; flex-wrap:wrap; justify-content:center')}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => (
          <path
            key={i}
            d={arcPath(seg.start, seg.start + seg.pct)}
            fill={seg.color}
            stroke="var(--bg-card)"
            strokeWidth="2"
          >
            <title>{`${seg.label}: ${seg.raw} (${seg.pct.toFixed(1)}%)`}</title>
          </path>
        ))}
      </svg>
      <div style={css('display:flex; flex-direction:column; gap:6px')}>
        {segments.map((seg, i) => (
          <div key={i} style={css('display:flex; align-items:center; gap:8px')}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
            <span style={css('font-size:11px; color:var(--muted-light)')}>{seg.label}</span>
            <span style={css('font-family:var(--font-mono); font-size:10.5px; color:var(--muted)')}>{seg.raw}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Line Chart (evolução temporal) ──
function LineChart({ bars, max, min }: { bars: { label: string; raw: string; val: number }[]; max: number; min: number }) {
  const w = 500, h = 160, padX = 40, padY = 20;
  const plotW = w - padX * 2, plotH = h - padY * 2;
  const range = Math.max(1, max - min);

  const points = bars.map((b, i) => ({
    x: padX + (bars.length > 1 ? (i / (bars.length - 1)) * plotW : plotW / 2),
    y: padY + plotH - ((b.val - min) / range) * plotH,
    ...b,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${h - padY} L ${points[0].x} ${h - padY} Z`;

  return (
    <div style={css('overflow-x:auto')}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: w, height: 'auto' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = padY + plotH * (1 - pct);
          const val = min + range * pct;
          return (
            <g key={i}>
              <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
              <text x={padX - 6} y={y + 3} textAnchor="end" fill="var(--muted)" fontSize="9" fontFamily="var(--font-mono)">
                {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
              </text>
            </g>
          );
        })}
        {/* Area fill */}
        <path d={areaPath} fill="url(#lineGrad)" opacity="0.15" />
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS[0]} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        {/* Line */}
        <path d={linePath} fill="none" stroke={CHART_COLORS[0]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Points + labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="var(--bg-card)" strokeWidth="2">
              <title>{`${p.label}: ${p.raw}`}</title>
            </circle>
            <text x={p.x} y={h - 4} textAnchor="middle" fill="var(--muted-dim)" fontSize="9" fontFamily="var(--font-body)">
              {p.label.length > 8 ? p.label.slice(0, 7) + '…' : p.label}
            </text>
            <text x={p.x} y={p.y - 8} textAnchor="middle" fill="var(--muted)" fontSize="8.5" fontFamily="var(--font-mono)">
              {p.raw}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Gráfico derivado da tabela real da resposta — barras verticais, horizontais, pizza ou linha, coloridos. */
export function AnswerChart({ table, on, onToggle }: AnswerChartProps) {
  const { headers, rows, labelCol, valueCol } = table;
  const vals = rows.map((r) => toNum(r[valueCol]));
  const max = Math.max(1, ...vals.map((v) => (Number.isNaN(v) ? 0 : Math.abs(v))));
  const total = vals.filter((v) => !Number.isNaN(v)).reduce((a, b) => a + Math.abs(b), 0);
  const min = Math.min(0, ...vals.map((v) => (Number.isNaN(v) ? 0 : v)));
  const bars = rows.slice(0, 12).map((r, i) => ({
    label: stripMd(r[labelCol]), raw: stripMd(r[valueCol]),
    val: Number.isNaN(vals[i]) ? 0 : vals[i],
  }));

  const chartType = detectChartType(rows, valueCol);
  const chartLabel = chartType === 'line' ? 'linha' : chartType === 'pie' ? 'pizza' : 'barras';

  return (
    <div style={css('margin-top:8px')}>
      <button onClick={onToggle} style={css(`display:inline-flex; align-items:center; gap:7px; padding:5px 11px; border-radius:8px; border:1px solid ${on ? 'var(--red-dim)' : 'var(--border)'}; background:${on ? 'var(--red-glow)' : 'transparent'}; color:${on ? 'var(--white)' : 'var(--muted-light)'}; font-family:var(--font-body); font-size:11.5px; font-weight:600; cursor:pointer`)}>
        <IC s={12} d='<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' w={2} />
        {on ? 'Ocultar gráfico' : 'Ver em gráfico'}
        <span style={css('font-family:var(--font-body); font-weight:400; color:var(--muted)')}>· {headers[valueCol] || 'valor'}</span>
      </button>
      {on && (
        <div style={css('margin-top:10px; border:1px solid var(--border); border-radius:12px; background:var(--bg-card); padding:18px 20px; overflow-x:auto')}>
          {chartType === 'line' ? (
            <LineChart bars={bars} max={max} min={min} />
          ) : chartType === 'pie' ? (
            <PieChart bars={bars} total={total} />
          ) : chartType === 'horizontal' ? (
            <HorizontalChart bars={bars} max={max} />
          ) : (
            <BarChart bars={bars} max={max} />
          )}
        </div>
      )}
    </div>
  );
}
