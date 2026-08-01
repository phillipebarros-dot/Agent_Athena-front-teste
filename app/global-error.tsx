'use client';

/**
 * Global error boundary — captura erros no root layout.
 * Último recurso antes da tela branca total.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          background: '#0a0a0f',
          color: '#e2e8f0',
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Erro crítico
        </h1>
        <p style={{ color: '#94a3b8', maxWidth: 420, marginBottom: '1.5rem', lineHeight: 1.5 }}>
          A Athena encontrou um erro inesperado. Tente recarregar a página.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '0.75rem 2rem',
            background: '#C41E1E',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: '1rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Recarregar
        </button>
      </body>
    </html>
  );
}
