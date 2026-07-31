'use client';
import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import sem SSR (PixiJS precisa de window/WebGL)
const BeyonderLive2D = dynamic(
  () => import('./BeyonderLive2D').then(m => ({ default: m.BeyonderLive2D })),
  { ssr: false }
);

interface BeyonderFloatingProps {
  /** Emocao vinda do contexto do chat (baseada na resposta da Athena) */
  emotion?: string;
  /** Se a Athena esta respondendo (ativa lip sync) */
  speaking?: boolean;
}

/**
 * BeyonderFloating - Icone flutuante do Beyonder no canto inferior direito.
 * 
 * Comportamento:
 * 1. Minimizado: icone circular 80px com modelo Live2D animado
 * 2. Clica: expande para 320x400 com balao de saudacao
 * 3. Modelo reage a emocoes do chat e faz lip sync quando Athena responde
 * 4. Clica de novo: minimiza
 */
export function BeyonderFloating({ emotion = 'neutral', speaking = false }: BeyonderFloatingProps) {
  const [expanded, setExpanded] = useState(false);
  const [speechText, setSpeechText] = useState<string | null>(null);

  const GREETINGS = [
    'Opa! Sou o Beyonder. Posso ajudar a entender qualquer funcao dessa plataforma.',
    'Fala comigo! Clica em qualquer botao que eu explico o que faz.',
    'O Beyonder esta aqui. Precisa de ajuda com alguma funcionalidade?',
    'Eu conhego cada botao, cada tela. Me pergunta!',
  ];

  const handleClick = useCallback(() => {
    if (!expanded) {
      // Expandir + mostrar saudacao
      setExpanded(true);
      setSpeechText(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
      // Esconder balao depois de 6s
      setTimeout(() => setSpeechText(null), 6000);
    } else {
      setExpanded(false);
      setSpeechText(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: expanded ? 20 : 24,
        right: expanded ? 20 : 24,
        zIndex: 9999,
        transition: 'all 0.3s ease',
      }}
    >
      <BeyonderLive2D
        emotion={emotion}
        speaking={speaking}
        expanded={expanded}
        onClick={handleClick}
        speechText={speechText || undefined}
      />

      {/* Label quando minimizado */}
      {!expanded && (
        <div
          onClick={handleClick}
          style={{
            position: 'absolute',
            bottom: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--red)',
            color: '#fff',
            fontSize: 8,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(221,0,4,0.4)',
          }}
        >
          Beyonder
        </div>
      )}

      {/* Botao fechar quando expandido */}
      {expanded && (
        <button
          onClick={() => { setExpanded(false); setSpeechText(null); }}
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            color: 'var(--muted)',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          X
        </button>
      )}
    </div>
  );
}

export default BeyonderFloating;
