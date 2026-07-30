'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const Ctx = createContext<{ light: boolean; toggle: () => void }>({ light: false, toggle: () => {} });
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children, defaultLight = false }: { children: React.ReactNode, defaultLight?: boolean }) {
  const [light, setLight] = useState(defaultLight);
  
  useEffect(() => {
    // Ao montar no cliente, verificar se a classe light já foi injetada no html
    if (typeof document !== 'undefined') {
      const isLight = document.documentElement.classList.contains('light');
      if (isLight !== light) {
        setLight(isLight);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('light', light);
      document.cookie = `athena_theme=${light ? 'light' : 'dark'};path=/;max-age=31536000;samesite=lax`;
    }
  }, [light]);

  return <Ctx.Provider value={{ light, toggle: () => setLight((v) => !v) }}>{children}</Ctx.Provider>;
}
