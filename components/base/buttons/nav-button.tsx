'use client';

import React from 'react';
import { css } from '@/lib/css';
import { Tooltip, TooltipTrigger, Button as AriaButton } from 'react-aria-components';

interface NavButtonProps {
  label: string;
  href: string;
  icon: any;
  current?: boolean;
}

export const NavButton = ({ label, href, icon: Icon, current }: NavButtonProps) => {
  return (
    <TooltipTrigger delay={0}>
      <AriaButton
        onPress={() => window.location.href = href}
        style={css(`
          position:relative; display:flex; align-items:center; justify-content:center;
          width:48px; height:48px; border-radius:12px; cursor:pointer;
          background:${current ? 'var(--red-glow)' : 'transparent'};
          color:${current ? 'var(--red)' : 'var(--muted)'};
          transition:all .2s ease; border:none; outline:none;
        `)}
        onMouseEnter={(e) => {
          if (!current) {
            e.currentTarget.style.background = 'var(--bg-card)';
            e.currentTarget.style.color = 'var(--fg)';
          }
        }}
        onMouseLeave={(e) => {
          if (!current) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--muted)';
          }
        }}
      >
        {Icon && <Icon size={24} weight={current ? 'fill' : 'regular'} />}
      </AriaButton>
      <Tooltip
        offset={12}
        placement="right"
        style={css('background:var(--bg-card); border:1px solid var(--border); border-radius:8px; padding:6px 12px; font-size:12px; font-weight:600; color:var(--white); box-shadow:var(--shadow-lg); pointer-events:none')}
      >
        {label}
      </Tooltip>
    </TooltipTrigger>
  );
};
