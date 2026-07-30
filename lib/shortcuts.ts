'use client';
import { useEffect } from 'react';

interface ShortcutActions {
  onNewConversation?: () => void;
  onToggleSidebar?: () => void;
  onFocusSearch?: () => void;
  onCopyLastResponse?: (messages: { role: string; content: string }[]) => void;
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      
      // Don't intercept when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        // Allow Ctrl+K even in inputs (search focus)
        if (e.key !== 'k') return;
      }

      switch (e.key.toLowerCase()) {
        case 'n': // Ctrl+N → New conversation
          e.preventDefault();
          actions.onNewConversation?.();
          break;
        case 'b': // Ctrl+B → Toggle sidebar
          e.preventDefault();
          actions.onToggleSidebar?.();
          break;
        case 'k': // Ctrl+K → Focus search
          e.preventDefault();
          actions.onFocusSearch?.();
          break;
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions]);
}
