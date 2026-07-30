'use client';
import React from 'react';
import { css } from '@/lib/dc';
import { AnimatedComposer } from '@/components/AnimatedComposer';

interface WelcomeScreenProps {
  userName: string;
  onSend: (text: string) => void;
  suggestions: string[];
  backendDown: boolean;
}

const pulseKeyframes = `
@keyframes athena-pulse {
  0%, 100% { filter: drop-shadow(0 0 8px rgba(190,40,40,0.3)); transform: scale(1); }
  50% { filter: drop-shadow(0 0 24px rgba(190,40,40,0.55)); transform: scale(1.04); }
}
`;

export function WelcomeScreen({ userName, onSend, suggestions, backendDown }: WelcomeScreenProps) {
  return (
    <div style={css('max-width:720px; margin:0 auto; display:flex; flex-direction:column; align-items:center; padding-top:6vh')}>
      {/* Inject pulse animation */}
      <style>{pulseKeyframes}</style>

      {/* Logo — larger with glow pulse */}
      <div style={css('margin-bottom:24px')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/athena-logo.png"
          alt="Athena"
          style={{
            width: 140,
            height: 'auto',
            animation: 'athena-pulse 3s ease-in-out infinite',
          }}
        />
      </div>

      <div style={css("font-family:var(--font-display); font-size:28px; font-weight:700; letter-spacing:2px; text-align:center")}>
        Olá, {userName || 'bem-vindo'}
      </div>
      <div style={css('font-size:14px; color:var(--muted-light); margin-top:12px; text-align:center; max-width:460px; line-height:1.7; text-wrap:pretty')}>
        Pergunte sobre investimento, inserções, PIs, audiência ou tabelas de preço. Consulto o Publi e as bases Kantar, nunca a web aberta.
      </div>

      <div style={css("font-family:var(--font-display); font-size:22px; font-weight:700; letter-spacing:1.5px; text-align:center; margin-top:28px; color:var(--white)")}>
        Como posso ajudar hoje?
      </div>
      <div style={css('font-size:13px; color:var(--red); margin-top:6px; text-align:center; letter-spacing:0.5px')}>
        Digite uma pergunta ou escolha um atalho
      </div>

      <div style={css('width:100%; margin-top:24px')}>
        <AnimatedComposer onSend={onSend} prompts={suggestions} disabled={backendDown} />
      </div>
    </div>
  );
}
