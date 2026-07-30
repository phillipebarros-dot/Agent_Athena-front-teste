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

export function WelcomeScreen({ userName, onSend, suggestions, backendDown }: WelcomeScreenProps) {
  return (
    <div style={css('max-width:720px; margin:0 auto; display:flex; flex-direction:column; align-items:center; padding-top:6vh')}>
      <div style={css('margin-bottom:20px')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/athena-logo.png" alt="Athena" style={css('width:88px; height:auto')} />
      </div>
      <div style={css("font-family:var(--font-display); font-size:26px; font-weight:700; letter-spacing:2px; text-align:center")}>Olá, {userName || 'bem-vindo'}</div>
      <div style={css('font-size:14px; color:var(--muted-light); margin-top:12px; text-align:center; max-width:460px; line-height:1.7; text-wrap:pretty')}>Pergunte sobre investimento, inserções, PIs, audiência ou tabelas de preço. Consulto o Publi e as bases Kantar, nunca a web aberta.</div>
      <div style={css('width:100%; margin-top:24px')}>
        <AnimatedComposer onSend={onSend} prompts={suggestions} disabled={backendDown} />
      </div>
    </div>
  );
}
