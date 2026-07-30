'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type ThemeCtx = { light: boolean; toggle: () => void };
const Ctx = createContext<ThemeCtx>({ light: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [light, setLight] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('light', light);
  }, [light]);
  return <Ctx.Provider value={{ light, toggle: () => setLight((v) => !v) }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
