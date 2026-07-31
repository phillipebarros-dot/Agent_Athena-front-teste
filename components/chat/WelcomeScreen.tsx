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
  0%, 100% { filter: drop-shadow(0 0 12px rgba(190,40,40,0.3)); transform: scale(1); }
  50% { filter: drop-shadow(0 0 32px rgba(190,40,40,0.55)); transform: scale(1.04); }
}
`;

export function WelcomeScreen({ userName, onSend, suggestions, backendDown }: WelcomeScreenProps) {
  return (
    <div style={css('max-width:720px; margin:0 auto; display:flex; flex-direction:column; align-items:center; padding-top:6vh')}>
      {/* Inject pulse animation */}
      <style>{pulseKeyframes}</style>

      {/* Logo — larger with glow pulse */}
      <div style={css('margin-bottom:28px')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/athena-logo.png"
          alt="Athena"
          style={{
            width: 160,
            height: 'auto',
            animation: 'athena-pulse 3s ease-in-out infinite',
          }}
        />
      </div>

      <div style={css("font-family:var(--font-display); font-size:32px; font-weight:700; letter-spacing:2.5px; text-align:center; animation: slideUp 0.5s ease both")}>
        {(() => {
          const h = new Date().getHours();
          const period = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
          return `${period}, ${userName || 'bem-vindo'}`;
        })()}
      </div>
      <div style={css('font-size:14.5px; color:var(--muted-light); margin-top:14px; text-align:center; max-width:480px; line-height:1.7; text-wrap:pretty; animation: slideUp 0.5s ease 0.1s both')}>
        Consulto dados de investimento, PIs, audiencia TV/radio (IBOPE), comportamento e consumo (TGI), tarefas do ERP e tabelas de preco. Fontes: Publi, Kantar e bases internas.
      </div>

      {/* Composer com titulo "Como posso ajudar" — sem duplicação */}
      <div style={css('width:100%; margin-top:32px; animation: slideUp 0.5s ease 0.2s both')}>
        <AnimatedComposer onSend={onSend} prompts={suggestions} disabled={backendDown} userName={userName} />
      </div>
    </div>
  );
}
