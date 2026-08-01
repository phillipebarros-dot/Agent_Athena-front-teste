'use client';

import { useEffect } from 'react';

/**
 * Error boundary global do Next.js App Router.
 * Captura erros em Client Components e mostra fallback
 * em vez de tela branca.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Athena Error Boundary]', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#e2e8f0',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(196, 30, 30, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C41E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Algo deu errado
      </h2>
      <p style={{ color: '#94a3b8', maxWidth: 420, marginBottom: '1.5rem', lineHeight: 1.5 }}>
        Ocorreu um erro inesperado. Tente novamente ou recarregue a página.
        {error.digest && (
          <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.5rem', color: '#64748b' }}>
            Código: {error.digest}
          </span>
        )}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.625rem 1.5rem',
          background: '#C41E1E',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseOver={(e) => ((e.target as HTMLElement).style.background = '#a01818')}
        onMouseOut={(e) => ((e.target as HTMLElement).style.background = '#C41E1E')}
      >
        Tentar novamente
      </button>
    </div>
  );
}
