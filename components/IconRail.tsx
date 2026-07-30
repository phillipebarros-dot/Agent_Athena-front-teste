'use client';
/**
 * Rail de ícones (tier 1) do padrão dual-tier: uma faixa fina à esquerda com as
 * áreas do produto (Chat, Auditoria, Ajustes) + tema e sair no rodapé. Fica antes
 * do painel largo (tier 2: conversas no chat, seções no admin). Marca OpusMúltipla.
 */
import { IC, css } from '@/lib/dc';

type RailProps = {
  active: 'chat' | 'admin';
  admin?: boolean;
  light?: boolean;
  onToggleTheme?: () => void;
  onLogout?: () => void;
};

const item = (d: string) => (on: boolean) => (
  <IC s={20} d={d} w={on ? 2 : 1.7} />
);

export function IconRail({ active, admin, light, onToggleTheme, onLogout }: RailProps) {
  const links: { id: string; href: string; label: string; d: string; show: boolean }[] = [
    { id: 'chat', href: '/chat', label: 'Conversas', show: true, d: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
    { id: 'admin', href: '/admin', label: 'Auditoria', show: !!admin, d: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
  ];
  const themeIcon = light
    ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
    : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>';

  return (
    <aside style={css('width:66px; flex-shrink:0; background:var(--rail); border-right:1px solid var(--border); display:flex; flex-direction:column; align-items:center; padding:14px 0; z-index:4')}>
      <a href="/chat" title="Athena" style={css('width:40px; height:40px; display:flex; align-items:center; justify-content:center; margin-bottom:18px')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/athena-logo.png" alt="Athena" style={css('width:34px; height:34px; object-fit:contain')} />
      </a>
      <nav style={css('flex:1; display:flex; flex-direction:column; align-items:center; gap:6px')}>
        {links.filter((l) => l.show).map((l) => {
          const on = active === l.id;
          return (
            <a key={l.id} href={l.href} title={l.label} style={css(`position:relative; width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; color:${on ? 'var(--red)' : 'var(--fg-3)'}; background:${on ? 'var(--red-glow)' : 'transparent'}; transition:all .18s`)}>
              <span style={css(`position:absolute; left:-14px; top:11px; bottom:11px; width:3px; border-radius:0 3px 3px 0; background:var(--red); opacity:${on ? 1 : 0}`)} />
              {item(l.d)(on)}
            </a>
          );
        })}
      </nav>
      <div style={css('display:flex; flex-direction:column; align-items:center; gap:6px')}>
        {onToggleTheme && (
          <button onClick={onToggleTheme} title="Tema" style={css('width:44px; height:44px; border:none; border-radius:12px; background:transparent; color:var(--fg-3); cursor:pointer; display:flex; align-items:center; justify-content:center')}>
            <IC s={18} d={themeIcon} w={2} />
          </button>
        )}
        {onLogout && (
          <button onClick={onLogout} title="Sair" style={css('width:44px; height:44px; border:none; border-radius:12px; background:transparent; color:var(--fg-3); cursor:pointer; display:flex; align-items:center; justify-content:center')}>
            <IC s={18} d='<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>' w={2} />
          </button>
        )}
      </div>
    </aside>
  );
}
