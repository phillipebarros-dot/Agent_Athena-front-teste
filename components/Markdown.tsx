'use client';
/** Renderiza o markdown que o backend (/chat) devolve, inclui tabelas GFM,
 * que é como o agente entrega dados. Estilizado no tema da Athena. */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function Markdown({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 14.5, lineHeight: 1.72, color: 'var(--white)', wordBreak: 'break-word' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (p) => <p style={{ margin: '0 0 10px' }} {...p} />,
          a: (p) => <a style={{ color: 'var(--red)' }} target="_blank" rel="noopener noreferrer" {...p} />,
          ul: (p) => <ul style={{ margin: '0 0 10px', paddingLeft: 20 }} {...p} />,
          ol: (p) => <ol style={{ margin: '0 0 10px', paddingLeft: 20 }} {...p} />,
          li: (p) => <li style={{ margin: '2px 0' }} {...p} />,
          strong: (p) => <strong style={{ fontWeight: 600 }} {...p} />,
          h1: (p) => <h1 style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 10px' }} {...p} />,
          h2: (p) => <h2 style={{ fontSize: 16, fontWeight: 700, margin: '4px 0 8px' }} {...p} />,
          h3: (p) => <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: '4px 0 6px' }} {...p} />,
          code: ({ children, ...rest }: any) => (
            <code style={{ fontFamily: "'SFMono-Regular',Consolas,monospace", fontSize: 12.5, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 5, padding: '1px 5px' }} {...rest}>{children}</code>
          ),
          pre: (p) => <pre style={{ margin: '0 0 10px', padding: 12, background: 'var(--bg-code, #0d0d0d)', border: '1px solid var(--border)', borderRadius: 10, overflowX: 'auto', fontSize: 12 }} {...p} />,
          table: (p) => (
            <div style={{ overflowX: 'auto', margin: '0 0 12px', border: '1px solid var(--border)', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }} {...p} />
            </div>
          ),
          thead: (p) => <thead style={{ background: 'var(--bg-raised, #161616)' }} {...p} />,
          th: (p) => <th style={{ textAlign: 'left', padding: '9px 14px', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--border-faint)', whiteSpace: 'nowrap' }} {...p} />,
          td: (p) => <td style={{ padding: '10px 14px', color: 'var(--white)', borderBottom: '1px solid var(--border-ghost, rgba(255,255,255,.04))' }} {...p} />,
          blockquote: (p) => <blockquote style={{ margin: '0 0 10px', paddingLeft: 12, borderLeft: '2px solid var(--red-dim)', color: 'var(--muted-light)' }} {...p} />,
          hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border-faint)', margin: '12px 0' }} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
