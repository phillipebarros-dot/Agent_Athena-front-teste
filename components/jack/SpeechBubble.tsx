/**
 * SpeechBubble - Balao de fala do Beyonder com efeito typewriter.
 *
 * Renderiza o texto letra por letra com velocidade configuravel.
 * Inclui tail (triangulo) apontando para o Beyonder e animacao de entrada.
 */
'use client';
import React, { useState, useEffect, useRef } from 'react';

interface SpeechBubbleProps {
  text: string;
  visible: boolean;
  typingSpeed?: number; // ms por caractere (default: 30)
  onFinishTyping?: () => void;
  position?: 'left' | 'right';
}

export default function SpeechBubble({
  text,
  visible,
  typingSpeed = 30,
  onFinishTyping,
  position = 'right',
}: SpeechBubbleProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible || !text) {
      setDisplayedText('');
      indexRef.current = 0;
      return;
    }

    setIsTyping(true);
    indexRef.current = 0;
    setDisplayedText('');

    intervalRef.current = setInterval(() => {
      indexRef.current++;
      if (indexRef.current >= text.length) {
        setDisplayedText(text);
        setIsTyping(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        onFinishTyping?.();
      } else {
        setDisplayedText(text.slice(0, indexRef.current));
      }
    }, typingSpeed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, visible, typingSpeed, onFinishTyping]);

  if (!visible) return null;

  const isLeft = position === 'left';

  return (
    <div
      style={{
        position: 'absolute',
        top: '8%',
        [isLeft ? 'left' : 'right']: '2%',
        maxWidth: '340px',
        minWidth: '200px',
        zIndex: 20,
        animation: 'jackBubbleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Balao principal */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '16px 20px',
          color: '#1a1a2e',
          fontSize: '14px',
          lineHeight: '1.65',
          fontFamily: "'Inter', 'DM Sans', sans-serif",
          fontWeight: 400,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid rgba(255,255,255,0.3)',
          position: 'relative',
        }}
      >
        {displayedText}
        {isTyping && (
          <span
            style={{
              display: 'inline-block',
              width: '2px',
              height: '14px',
              background: '#c0392b',
              marginLeft: '2px',
              verticalAlign: 'text-bottom',
              animation: 'jackCursorBlink 0.8s step-end infinite',
            }}
          />
        )}
      </div>

      {/* Tail (triangulo) */}
      <div
        style={{
          position: 'absolute',
          bottom: '-10px',
          [isLeft ? 'left' : 'right']: '40px',
          width: 0,
          height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: '12px solid rgba(255, 255, 255, 0.95)',
          filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.08))',
        }}
      />

      {/* CSS animations inline */}
      <style>{`
        @keyframes jackBubbleIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes jackCursorBlink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
