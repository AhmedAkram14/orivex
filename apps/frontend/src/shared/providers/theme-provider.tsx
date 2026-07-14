'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'orivex-theme';

interface ThemeContextValue {
  /** The user's stored preference — 'system' means "no explicit choice, follow the OS". */
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

/**
 * Owns the `data-theme` attribute and its persistence — the mechanism
 * design-system/tokens/theme-dark.css was built to be driven by (see that
 * file's own comment: "Phase 24's only job will be to stamp data-theme
 * onto <html>"). Every token value already exists from Phase 1; this is
 * purely the read/write/apply logic, with no new tokens introduced.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setThemeState(stored);
    }
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider.');
  }
  return context;
}

/**
 * Inline, synchronous script rendered in <head> — applies the stored theme
 * before React hydrates/paints, avoiding a flash of the wrong theme. This
 * is the one place a blocking inline script is appropriate: it must run
 * before first paint, which no React effect can guarantee.
 */
export function ThemeScript() {
  const script = `
    try {
      var theme = localStorage.getItem('${STORAGE_KEY}');
      if (theme === 'light' || theme === 'dark') {
        document.documentElement.setAttribute('data-theme', theme);
      }
    } catch (e) {}
  `;
  // Static, non-user-controlled script content.
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
