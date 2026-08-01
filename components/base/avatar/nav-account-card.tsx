'use client';
import React, { useState } from 'react';
import { Dialog, DialogTrigger, Popover, Button as AriaButton } from 'react-aria-components';
import { css } from '@/lib/css';
import { LogOut01, Settings01 } from '@untitledui/icons';
import { useRouter } from 'next/navigation';

export const NavAccountCard = () => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <AriaButton
        style={css('background:transparent; border:none; cursor:pointer; width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; transition:all .2s')}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={css('width:36px; height:36px; border-radius:50%; background:var(--border); overflow:hidden; display:flex; align-items:center; justify-content:center; font-weight:600; color:var(--fg); font-size:14px')}>
          A
        </div>
      </AriaButton>
      <Popover placement="right bottom" offset={12} style={css('background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:8px; width:200px; box-shadow:var(--shadow-lg); color:var(--fg); z-index:100; font-family:var(--font-body)')}>
        <Dialog style={{ outline: 'none' }}>
          <div style={css('display:flex; flex-direction:column; gap:4px')}>
            <button
              onClick={() => { setIsOpen(false); router.push('/admin?tab=config'); }}
              style={css('display:flex; align-items:center; gap:8px; background:transparent; border:none; color:var(--fg); cursor:pointer; padding:8px; border-radius:8px; font-size:13px; font-weight:500')}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-panel)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Settings01 style={{ width: 16, height: 16 }} />
              Configurações
            </button>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <button
              onClick={() => {
                setIsOpen(false);
                document.cookie = 'athena_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                window.location.href = '/login';
              }}
              style={css('display:flex; align-items:center; gap:8px; background:transparent; border:none; color:var(--red); cursor:pointer; padding:8px; border-radius:8px; font-size:13px; font-weight:500')}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--red-glow)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut01 style={{ width: 16, height: 16 }} />
              Sair
            </button>
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
};
