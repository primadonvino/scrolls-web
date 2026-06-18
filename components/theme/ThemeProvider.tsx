"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "cheetah";
export const THEMES: Theme[] = ["light", "dark", "cheetah"];
export const THEME_STORAGE_KEY = "scrolls.theme";

/**
 * Inline script that applies the saved theme before paint. The server already
 * renders data-theme from the cookie (no flash); this is a belt-and-suspenders
 * fallback that prefers the cookie and falls back to localStorage.
 */
export const themeInitScript = `try{var m=document.cookie.match(/(?:^|; )${THEME_STORAGE_KEY.replace(".", "\\\\.")}=([^;]+)/);var t=m?m[1]:localStorage.getItem('${THEME_STORAGE_KEY}');document.documentElement.dataset.theme=(t==='light'||t==='cheetah'||t==='dark')?t:'dark';}catch(e){}`;

type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>.");
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  // Sync state to whatever the no-flash script already applied.
  useEffect(() => {
    const current = document.documentElement.dataset.theme as Theme | undefined;
    if (current && THEMES.includes(current)) setThemeState(current);
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    // Cookie drives the server-rendered theme (no flash on refresh); localStorage
    // is a fallback for the inline script.
    document.cookie = `${THEME_STORAGE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures (private mode, etc.).
    }
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
