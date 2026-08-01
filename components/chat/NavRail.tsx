'use client';
import React, { useState } from 'react';
import {
  ChatCircle, ChartBar, GearSix, User, SignOut, Moon, Sun,
  ShieldCheck, Question,
} from '@phosphor-icons/react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * NavRail — Coluna slim de navegacao (estilo UntitledUI SidebarNavigationSlim).
 *
 * - 64px de largura
 * - Icones com tooltip
 * - Items arredondados
 * - Footer com perfil, tema, logout
 */

interface NavRailProps {
  me: { name?: string; email?: string; admin?: boolean; picture?: string } | null;
  light?: boolean;
  onToggleTheme?: () => void;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { id: 'chat', label: 'Chat', icon: ChatCircle, href: '/chat' },
  { id: 'admin', label: 'Dashboard', icon: ChartBar, href: '/admin', adminOnly: true },
  { id: 'audit', label: 'Auditoria', icon: ShieldCheck, href: '/admin?tab=visao', adminOnly: true },
  { id: 'faq', label: 'Ajuda', icon: Question, href: '/faq' },
];

const FOOTER_ITEMS = [
  { id: 'settings', label: 'Configuracoes', icon: GearSix, href: '/admin?tab=config', adminOnly: true },
];

function initials(name?: string) {
  if (!name) return '?';
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export function NavRail({ me, light, onToggleTheme, onLogout }: NavRailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);

  const isActive = (href: string) => {
    if (href === '/chat') return pathname === '/chat';
    if (href === '/admin') return pathname === '/admin';
    if (href.includes('?')) return false;
    return pathname?.startsWith(href) || false;
  };

  const items = NAV_ITEMS.filter(i => !i.adminOnly || me?.admin);
  const footerItems = FOOTER_ITEMS.filter(i => !i.adminOnly || me?.admin);

  return (
    <nav style={{
      width: 64,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'var(--glass-surface)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderRight: '1px solid var(--glass-border)',
      height: '100%',
      padding: '16px 0 12px',
      gap: 0,
      zIndex: 5,
    }}>
      {/* Logo */}
      <div
        style={{ marginBottom: 20, cursor: 'pointer' }}
        onClick={() => router.push('/chat')}
        title="Athena"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/athena-logo.png"
          alt="Athena"
          style={{
            width: 36, height: 36, objectFit: 'contain',
            filter: 'drop-shadow(0 2px 8px rgba(221,0,4,.2))',
          }}
        />
      </div>

      {/* Separator */}
      <div style={{
        width: 32, height: 1,
        background: 'var(--border-faint)',
        marginBottom: 12,
      }} />

      {/* Nav items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '0 8px' }}>
        {items.map(item => {
          const active = isActive(item.href);
          const hover = hovered === item.id;
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => router.push(item.href)}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              title={item.label}
              style={{
                position: 'relative',
                width: 48, height: 48,
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                background: active
                  ? 'rgba(221,0,4,0.1)'
                  : hover ? 'var(--bg-panel)' : 'transparent',
                color: active ? 'var(--red)' : hover ? 'var(--white)' : 'var(--muted)',
                transition: 'all .2s ease',
                margin: '0 auto',
              }}
            >
              <Icon size={22} weight={active ? 'fill' : 'regular'} />
              {/* Tooltip */}
              {hover && (
                <div style={{
                  position: 'absolute', left: 56, top: '50%', transform: 'translateY(-50%)',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '6px 12px',
                  fontSize: 12, fontWeight: 600, color: 'var(--white)',
                  whiteSpace: 'nowrap', zIndex: 100,
                  boxShadow: 'var(--shadow-lg)',
                  pointerEvents: 'none',
                }}>
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '0 8px' }}>
        {footerItems.map(item => {
          const hover = hovered === item.id;
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => router.push(item.href)}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              title={item.label}
              style={{
                position: 'relative',
                width: 48, height: 48,
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                background: hover ? 'var(--bg-panel)' : 'transparent',
                color: hover ? 'var(--white)' : 'var(--muted)',
                transition: 'all .2s ease',
                margin: '0 auto',
              }}
            >
              <Icon size={20} weight="regular" />
              {hover && (
                <div style={{
                  position: 'absolute', left: 56, top: '50%', transform: 'translateY(-50%)',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '6px 12px',
                  fontSize: 12, fontWeight: 600, color: 'var(--white)',
                  whiteSpace: 'nowrap', zIndex: 100,
                  boxShadow: 'var(--shadow-lg)',
                  pointerEvents: 'none',
                }}>
                  {item.label}
                </div>
              )}
            </div>
          );
        })}

        {/* Separator */}
        <div style={{
          width: 32, height: 1,
          background: 'var(--border-faint)',
          margin: '4px auto',
        }} />

        {/* Theme toggle */}
        {onToggleTheme && (
          <div
            onClick={onToggleTheme}
            onMouseEnter={() => setHovered('theme')}
            onMouseLeave={() => setHovered(null)}
            title={light ? 'Tema escuro' : 'Tema claro'}
            style={{
              width: 48, height: 48,
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              background: hovered === 'theme' ? 'var(--bg-panel)' : 'transparent',
              color: hovered === 'theme' ? 'var(--white)' : 'var(--muted)',
              transition: 'all .2s ease',
              margin: '0 auto',
            }}
          >
            {light ? <Moon size={20} /> : <Sun size={20} />}
          </div>
        )}

        {/* User avatar */}
        <div
          onClick={() => setHovered(h => h === 'user-menu' ? null : 'user-menu')}
          title={me?.name || me?.email || 'Perfil'}
          style={{
            position: 'relative',
            width: 40, height: 40,
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            background: 'var(--bg-input)',
            color: 'var(--muted-light)',
            fontSize: 13, fontWeight: 700,
            border: hovered === 'user-menu' ? '2px solid var(--red-dim)' : '2px solid transparent',
            transition: 'border-color .2s ease',
            margin: '4px auto 0',
          }}
        >
          {me?.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.picture} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initials(me?.name || me?.email)
          )}

          {/* User popup menu */}
          {hovered === 'user-menu' && (
            <div
              onMouseLeave={() => setHovered(null)}
              style={{
                position: 'absolute', left: 52, bottom: 0,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 8,
                minWidth: 180, zIndex: 100,
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <div style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>
                {me?.name || 'Usuario'}
              </div>
              <div style={{ padding: '2px 12px 8px', fontSize: 11, color: 'var(--muted)', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                {me?.email}
              </div>
              <div
                onClick={(e) => { e.stopPropagation(); onLogout(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 8,
                  fontSize: 13, color: 'var(--red)',
                  cursor: 'pointer', transition: 'background .15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(221,0,4,.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <SignOut size={16} /> Sair da conta
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
