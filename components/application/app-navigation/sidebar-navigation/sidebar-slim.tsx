'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { UntitledLogo } from '@/components/foundations/logo/untitledui-logo';
import { NavButton } from '@/components/base/buttons/nav-button';
import { NavAccountCard } from '@/components/base/avatar/nav-account-card';
import { css } from '@/lib/css';
import { NavItemType } from '../config';

interface SidebarNavigationSlimProps {
  items: NavItemType[];
  footerItems: NavItemType[];
}

export const SidebarNavigationSlim = ({ items, footerItems }: SidebarNavigationSlimProps) => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/' || href === '/chat') return pathname === '/chat' || pathname === '/';
    if (href === '/admin' || href === '/dashboard') return pathname === '/admin' || pathname === '/dashboard';
    return pathname?.startsWith(href) || false;
  };

  return (
    <nav style={css('width:72px; flex-shrink:0; display:flex; flex-direction:column; align-items:center; background:var(--bg-panel); border-right:1px solid var(--border); height:100%; padding:16px 0 12px; gap:8px; z-index:5')}>
      <div style={css('margin-bottom:16px')}>
        <UntitledLogo />
      </div>

      <div style={css('width:32px; height:1px; background:var(--border-faint); margin-bottom:8px')} />

      <div style={css('flex:1; display:flex; flex-direction:column; gap:8px; width:100%; padding:0 12px')}>
        {items.map((item, i) => (
          <NavButton
            key={i}
            icon={item.icon}
            label={item.label}
            href={item.href}
            current={isActive(item.href)}
          />
        ))}
      </div>

      <div style={css('display:flex; flex-direction:column; gap:8px; width:100%; padding:0 12px')}>
        {footerItems.map((item, i) => (
          <NavButton
            key={`footer-${i}`}
            icon={item.icon}
            label={item.label}
            href={item.href}
            current={isActive(item.href)}
          />
        ))}

        <div style={css('width:32px; height:1px; background:var(--border-faint); margin:8px auto')} />
        
        <NavAccountCard />
      </div>
    </nav>
  );
};
