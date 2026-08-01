/**
 * Loading skeleton global.
 * Exibido automaticamente pelo Next.js durante navegação server-side.
 */
export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '0.5rem',
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#C41E1E',
          animation: 'pulse 1.2s ease-in-out infinite',
        }}
      />
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#C41E1E',
          animation: 'pulse 1.2s ease-in-out 0.2s infinite',
        }}
      />
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#C41E1E',
          animation: 'pulse 1.2s ease-in-out 0.4s infinite',
        }}
      />
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
