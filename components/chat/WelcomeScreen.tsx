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

const floatKeyframes = `
@keyframes athena-float {
  0%, 100% { transform: translateY(0); filter: drop-shadow(0 0 12px rgba(196,30,30,0.4)) drop-shadow(0 8px 24px rgba(0,0,0,0.4)); }
  50% { transform: translateY(-8px); filter: drop-shadow(0 0 28px rgba(196,30,30,0.7)) drop-shadow(0 8px 24px rgba(0,0,0,0.4)); }
}
`;

export function WelcomeScreen({ userName, onSend, suggestions, backendDown }: WelcomeScreenProps) {
  return (
    <div style={css('max-width:720px; margin:0 auto; display:flex; flex-direction:column; align-items:center; padding-top:6vh')}>
      {/* Inject float animation */}
      <style>{floatKeyframes}</style>

      {/* Logo — subtle float, no boxy glow */}
      <div style={css('margin-bottom:28px')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/athena-logo.png"
          alt="Athena"
          style={{
            width: 160,
            height: 'auto',
            animation: 'athena-float 4s ease-in-out infinite',
            filter: 'drop-shadow(0 0 18px rgba(196,30,30,0.5)) drop-shadow(0 8px 24px rgba(0,0,0,0.4))',
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
