import Link from 'next/link';

/**
 * Página 404 customizada.
 * Substitui a tela branca padrão do Next.js.
 */
export default function NotFound() {
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
      <div style={{ fontSize: '4rem', fontWeight: 700, color: '#C41E1E', marginBottom: '0.5rem' }}>
        404
      </div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Página não encontrada
      </h2>
      <p style={{ color: '#94a3b8', maxWidth: 420, marginBottom: '1.5rem', lineHeight: 1.5 }}>
        A página que você procura não existe ou foi movida.
      </p>
      <Link
        href="/chat"
        style={{
          padding: '0.625rem 1.5rem',
          background: '#C41E1E',
          color: '#fff',
          borderRadius: 8,
          fontSize: '0.875rem',
          fontWeight: 500,
          textDecoration: 'none',
          transition: 'background 0.2s',
        }}
      >
        Voltar ao chat
      </Link>
    </div>
  );
}
