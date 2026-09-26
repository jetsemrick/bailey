import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  THEME_CHANGE_EVENT,
  applyTheme,
  readTheme,
  writeTheme,
  type ThemeId,
} from '../lib/themeSettings';

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const sync = () => {
      const next = readTheme();
      setThemeState(next);
      applyTheme(next);
    };
    window.addEventListener(THEME_CHANGE_EVENT, sync);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSchemeChange = () => applyTheme(readTheme());
    media.addEventListener('change', onSchemeChange);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, sync);
      media.removeEventListener('change', onSchemeChange);
    };
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    writeTheme(next);
    setThemeState(next);
    applyTheme(next);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
