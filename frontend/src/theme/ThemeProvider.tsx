import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { theme as defaultTheme, type Theme } from './index';
import { applyThemeToDom } from './cssVars';

const STORAGE_KEY = 'managepme_theme';

function loadSavedOverrides(): Partial<Theme> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Theme>;
    return parsed;
  } catch {
    return null;
  }
}

function saveOverrides(overrides: Partial<Theme>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const out = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const s = source[key];
    if (s != null && typeof s === 'object' && !Array.isArray(s) && typeof (target as Record<string, unknown>)[key as string] === 'object') {
      (out as Record<string, unknown>)[key as string] = deepMerge(
        (target[key] as Record<string, unknown>) || {},
        s as Record<string, unknown>
      );
    } else if (s !== undefined) {
      (out as Record<string, unknown>)[key as string] = s;
    }
  }
  return out;
}

type ThemeContextValue = {
  theme: Theme;
  updateToken: <K extends keyof Theme>(group: K, key: string, value: unknown) => void;
  resetTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const overrides = useMemo(() => loadSavedOverrides(), []);
  const [mergedTheme, setMergedTheme] = useState<Theme>(() =>
    overrides ? deepMerge(defaultTheme as Record<string, unknown>, overrides as Record<string, unknown>) as Theme : defaultTheme
  );

  const applyAndPersist = useCallback((next: Theme) => {
    setMergedTheme(next);
    applyThemeToDom(next);
    const overridesToSave = JSON.parse(JSON.stringify(next)) as Partial<Theme>;
    saveOverrides(overridesToSave);
  }, []);

  const updateToken = useCallback(<K extends keyof Theme>(group: K, key: string, value: unknown) => {
    setMergedTheme((prev) => {
      const groupObj = prev[group];
      if (groupObj == null || typeof groupObj !== 'object') return prev;
      const next = { ...prev, [group]: { ...(groupObj as Record<string, unknown>), [key]: value } };
      applyThemeToDom(next as Theme);
      saveOverrides(next as Partial<Theme>);
      return next as Theme;
    });
  }, []);

  const resetTheme = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setMergedTheme(defaultTheme);
    applyThemeToDom(defaultTheme);
  }, []);

  useEffect(() => {
    applyThemeToDom(mergedTheme);
  }, [mergedTheme]);

  const value = useMemo(
    () => ({ theme: mergedTheme, updateToken, resetTheme }),
    [mergedTheme, updateToken, resetTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
