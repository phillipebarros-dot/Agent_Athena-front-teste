'use client';
import React, { useState } from 'react';
import { B, IC, css } from '@/lib/dc';
import { Markdown } from '@/components/Markdown';
import { FeedbackActions, FeedbackForm } from './FeedbackPanel';
import { AnswerChart, parseTable, stripMd } from './AnswerChart';
import type { ChatMessage } from '@/lib/types';
import { initials } from '@/lib/format';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageBubbleProps {
  message: ChatMessage;
  me: { name?: string; email?: string; picture?: string } | null;
  onSendFeedback: (m: ChatMessage, rating: 'positive' | 'negative', comment?: string) => void;
  onRegenerate?: () => void;
  chartOpen: boolean;
  onToggleChart: () => void;
}

/** Bubble de mensagem do usuário. */
function UserBubble({ message, me }: { message: ChatMessage; me: MessageBubbleProps['me'] }) {
  return (
    <div style={css('display:flex; flex-direction:row-reverse; gap:14px; align-items:flex-start; margin-left: 20%;')}>
      {/* Avatar do usuário — foto do Google ou iniciais */}
      <div style={css('width:40px; height:40px; border-radius:50%; background:var(--bg-surface); border:1px solid var(--glass-border); display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px; overflow:hidden; box-shadow:var(--shadow-sm)')}>      
        {me?.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.picture} alt={me.name || 'Eu'} referrerPolicy="no-referrer" style={css('width:100%; height:100%; object-fit:cover;')} />
        ) : (
          <span style={css('font-size:13px; font-weight:700; color:var(--muted-light); letter-spacing:0.5px')}>{initials(me?.name || me?.email || '?')}</span>
        )}
      </div>
      <div style={css('flex:1; min-width:0; display:flex; flex-direction:column; align-items:flex-end')}>
        <div style={css('display:inline-block; max-width:100%; background:var(--user-bubble); border:1px solid var(--glass-border); border-radius:24px 6px 24px 24px; padding:13px 20px; font-size:15px; line-height:1.65; white-space:pre-wrap; color:var(--white); box-shadow:var(--shadow-sm);')}>
          {message.content}
        </div>
      </div>
    </div>
  );
}

/** Bubble de resposta da Athena. */
function AssistantBubble({ message, me, onSendFeedback, onRegenerate, chartOpen, onToggleChart }: MessageBubbleProps) {
  const [fbOpen, setFbOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const table = !message.error ? parseTable(message.content) : null;

  return (
    <div 
      style={css('display:flex; gap:14px; align-items:flex-start')} 
      onMouseEnter={() => setHovered(true)} 
      onMouseLeave={() => setHovered(false)}
    >
      <motion.img
        src="/athena-logo.png"
        alt="Athena"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.05 }}
        style={css('width:38px; height:38px; object-fit:contain; flex-shrink:0; margin-top:2px;')}
      />
      
      <div style={css('flex:1; min-width:0; max-width: 100%; position:relative')}>
        <div style={css(`display:block; max-width:100%; padding:0 0 8px 0;`)}>
          {message.error ? (
            <div style={css('background:var(--bg-card); border:1px solid var(--red-dim); border-radius:12px; padding:13px 16px;')}>
              <span style={css('font-size:14.5px; color:var(--muted-light)')}>{message.content}</span>
            </div>
          ) : (
            <div className="shielded" style={css('font-size:15px; line-height:1.625; color:var(--white)')}>
              {/* A9: Rótulo de fonte por bloco */}
              {!message.error && (message.sources || message.query) && (() => {
                const hasBQ = message.query || message.sources?.some(s => s.label?.toLowerCase().includes('bigquery') || s.label?.toLowerCase().includes('publi') || s.label?.toLowerCase().includes('kantar'));
                const hasWeb = message.sources?.some(s => s.label?.toLowerCase().includes('web') || s.label?.toLowerCase().includes('pesquisa'));
                const badges: { label: string; color: string }[] = [];
                if (hasBQ) badges.push({ label: 'BigQuery (Publi)', color: 'var(--green)' });
                if (hasWeb) badges.push({ label: 'Web', color: 'var(--blue, #58a6ff)' });
                if (!hasBQ && !hasWeb) badges.push({ label: 'Modelo', color: 'var(--gold)' });
                // A6: Badge recorte geográfico
                const states = ['Paraná', 'Santa Catarina', 'Rio Grande do Sul', 'São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia', 'Ceará', 'Pernambuco', 'Goiás', 'Distrito Federal'];
                const content = message.content || '';
                const found = states.filter(s => content.includes(s));
                if (found.length === 1) badges.push({ label: `📍 ${found[0]}`, color: 'var(--muted-light)' });
                else if (found.length > 1) badges.push({ label: `📍 ${found.length} estados`, color: 'var(--muted-light)' });
                return (
                  <div style={css('display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px')}>
                    {badges.map((b, i) => (
                      <span key={i} style={css(`display:inline-flex; align-items:center; gap:5px; padding:2px 9px; border-radius:6px; font-size:10.5px; font-weight:600; color:${b.color}; background:rgba(0,0,0,0.15); border:1px solid ${b.color}22; letter-spacing:.02em`)}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: b.color }} />
                        {b.label}
                      </span>
                    ))}
                  </div>
                );
              })()}
              <Markdown>{message.content}</Markdown>
            </div>
          )}

          {/* Attachment */}
          {message.attachment?.url && (
            <a href={message.attachment.view_url || message.attachment.url} target="_blank" rel="noopener noreferrer" style={css('display:inline-flex; align-items:center; gap:8px; margin-top:12px; padding:8px 12px; border:1px solid var(--border); border-radius:8px; font-size:12px; color:var(--white); text-decoration:none; background:var(--bg-surface); transition:background 0.2s;')} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card)'} onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}>
              <IC s={14} d='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' stroke="var(--green)" />
              Abrir {message.attachment.file_type === 'sheet' ? 'planilha' : 'PDF'}
            </a>
          )}

          {/* Sources / Query */}
          {!message.error && (message.query || (message.sources && message.sources.length > 0)) && (
            <details style={css('margin-top:16px; border:1px solid var(--border-faint); border-radius:12px; padding:10px 14px; background:var(--bg-surface); box-shadow:0 1px 2px rgba(0,0,0,0.02)')}>
              <summary style={css('cursor:pointer; font-size:11.5px; letter-spacing:1px; text-transform:uppercase; color:var(--muted-light); font-weight:600; display:flex; align-items:center; gap:8px')}>
                <SparklesIcon />
                Como cheguei nesse resultado
              </summary>
              {message.sources && message.sources.length > 0 && (
                <div style={css('display:flex; flex-wrap:wrap; gap:6px; margin-top:12px')}>
                  {message.sources.map((s, si) => (
                    <span key={si} style={css('display:inline-flex; align-items:center; gap:6px; padding:4px 9px; border-radius:20px; border:1px solid var(--border); background:var(--bg-panel); font-size:11.5px; color:var(--muted-light)')}><span style={css('width:5px; height:5px; border-radius:50%; background:var(--green-dim)')} />{s.label}{s.detail ? ` · ${s.detail}` : ''}</span>
                  ))}
                </div>
              )}
              {message.query && (
                <pre style={css("margin:12px 0 0; padding:14px; background:var(--bg-code); border:1px solid var(--border); border-radius:10px; overflow-x:auto; font-family:var(--font-mono); font-size:12px; line-height:1.7; color:var(--muted-light); white-space:pre-wrap; word-break:break-word")}>{message.query}</pre>
              )}
            </details>
          )}

          {/* Aviso de truncamento + A5: Ampliar busca */}
          {!message.error && table && table.rows.length >= 2 && table.rows.length <= 5 && (
            <div style={css('display:flex; align-items:center; gap:8px; margin-top:12px; padding:10px 14px; background:rgba(201,162,39,.08); border:1px solid rgba(201,162,39,.18); border-radius:8px; font-size:12px; color:var(--gold)')}>
              <IC s={14} d='<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' stroke="var(--gold)" />
              <span style={css('flex:1')}>Resultados podem estar incompletos. Tente refinar sua pergunta para um período ou veículo específico.</span>
              {onRegenerate && (
                <button
                  onClick={() => onRegenerate()}
                  style={css('flex-shrink:0; padding:4px 10px; border:1px solid rgba(201,162,39,.3); border-radius:6px; background:transparent; color:var(--gold); font-size:11px; font-weight:600; cursor:pointer; font-family:var(--font-body); transition:background .2s')}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,162,39,.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Ampliar busca
                </button>
              )}
            </div>
          )}
        </div>

        {/* Export CSV / XLSX — aparece quando tem tabela */}
        {table && (
          <div style={css('display:flex; gap:8px; margin-top:4px; margin-bottom:4px;')}>
            <button
              onClick={() => {
                const hdrs = table.headers.map(h => stripMd(h));
                const csv = [hdrs.join(','), ...table.rows.map(r => r.map(c => `"${stripMd(c).replace(/"/g, '""')}"`).join(','))].join('\n');
                const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `athena_export_${Date.now()}.csv`; a.click();
                URL.revokeObjectURL(url);
              }}
              style={css('display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border-radius:8px; border:1px solid var(--border); background:var(--bg-surface); font-size:11.5px; color:var(--muted-light); cursor:pointer; transition:all 0.2s;')}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--white)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--muted-light)'; }}
            >
              <IC s={13} d='<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' stroke="currentColor" />
              CSV
            </button>
            <button
              onClick={async () => {
                try {
                  const data = table.rows.map(r => {
                    const obj: Record<string, string> = {};
                    table.headers.forEach((h, i) => { obj[stripMd(h)] = stripMd(r[i] || ''); });
                    return obj;
                  });
                  const { api } = await import('@/lib/api');
                  const result = await api.export({ data, title: 'athena_export', format: 'csv' });
                  if (result && (result as any).content_base64) {
                    const bin = atob((result as any).content_base64);
                    const bytes = new Uint8Array(bin.length);
                    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = (result as any).filename || 'athena_export.xlsx'; a.click();
                    URL.revokeObjectURL(url);
                  }
                } catch { /* fallback silencioso */ }
              }}
              style={css('display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border-radius:8px; border:1px solid var(--border); background:var(--bg-surface); font-size:11.5px; color:var(--muted-light); cursor:pointer; transition:all 0.2s;')}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--white)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--muted-light)'; }}
            >
              <IC s={13} d='<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' stroke="currentColor" />
              XLSX
            </button>
            <button
              onClick={() => {
                const hdrs = table.headers.map(h => stripMd(h));
                const cleanRows = table.rows.map(r => r.map(c => stripMd(c)));
                const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Athena Export</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#222}h2{color:#C41E1E;margin-bottom:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:10px 14px;text-align:left;font-size:13px}th{background:#C41E1E;color:white;font-weight:600}tr:nth-child(even){background:#f9f9f9}.footer{margin-top:30px;font-size:11px;color:#999}</style></head><body><h2>Athena — Relatório</h2><table><tr>${hdrs.map(h => `<th>${h}</th>`).join('')}</tr>${cleanRows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table><div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')} • Athena, OpusMúltipla</div></body></html>`;
                const w = window.open('', '_blank');
                if (w) { w.document.write(html); w.document.close(); setTimeout(() => { w.print(); }, 500); }
              }}
              style={css('display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border-radius:8px; border:1px solid var(--border); background:var(--bg-surface); font-size:11.5px; color:var(--muted-light); cursor:pointer; transition:all 0.2s;')}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--white)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--muted-light)'; }}
            >
              <IC s={13} d='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' stroke="currentColor" />
              PDF
            </button>
            <button
              onClick={async () => {
                try {
                  const data = table.rows.map(r => {
                    const obj: Record<string, string> = {};
                    table.headers.forEach((h, i) => { obj[stripMd(h)] = stripMd(r[i] || ''); });
                    return obj;
                  });
                  const { api } = await import('@/lib/api');
                  const result = await api.export({ data, title: 'athena_export', format: 'sheets', user_email: me?.email || '' });
                  if (result && (result as any).url) {
                    window.open((result as any).url, '_blank');
                  } else if (result && (result as any).message) {
                    alert((result as any).message);
                  }
                } catch { /* silencioso */ }
              }}
              style={css('display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border-radius:8px; border:1px solid var(--border); background:var(--bg-surface); font-size:11.5px; color:var(--muted-light); cursor:pointer; transition:all 0.2s;')}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#0F9D58'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--muted-light)'; }}
            >
              <IC s={13} d='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>' stroke="currentColor" />
              Sheets
            </button>
          </div>
        )}

        {/* Chart */}
        {table && <div style={css('margin-bottom:12px')}><AnswerChart table={table} on={chartOpen} onToggle={onToggleChart} /></div>}

        {/* Action Bar (Regenerar, Ouvir, Copiar, Feedback) */}
        {!message.error && (
          <AnimatePresence>
            {hovered && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 5 }} 
                style={css('position:relative; z-index:10; margin-top:8px;')}
              >
                <FeedbackActions message={message} onSendFeedback={onSendFeedback} fbOpen={fbOpen} onToggleFb={() => setFbOpen(!fbOpen)} onRegenerate={onRegenerate} />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Feedback form */}
        {fbOpen && (
          <div style={css('margin-top:20px;')}>
            <FeedbackForm message={message} onSendFeedback={(m, r, c) => { onSendFeedback(m, r, c); setFbOpen(false); }} onClose={() => setFbOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  );
}

function MessageBubbleInner(props: MessageBubbleProps) {
  if (props.message.role === 'user') {
    return <UserBubble message={props.message} me={props.me} />;
  }
  return <AssistantBubble {...props} />;
}

export const MessageBubble = React.memo(MessageBubbleInner, (prev, next) => {
  return prev.message.message_id === next.message.message_id
    && prev.message.content === next.message.content
    && prev.message.fb === next.message.fb
    && prev.chartOpen === next.chartOpen
    && prev.onRegenerate === next.onRegenerate;
});
