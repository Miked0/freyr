import { create } from 'zustand';
import { applyTheme, readTheme, saveTheme, type Theme } from './theme';

function storage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

const systemMedia = (query: string) => window.matchMedia(query);

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

function initialTheme(): Theme {
  const theme = readTheme(storage(), systemMedia);
  applyTheme(theme, document);
  return theme;
}

/** App-wide theme. The inline script in index.html already applied it on load; this keeps it in step. */
export const useTheme = create<ThemeState>(set => ({
  theme: initialTheme(),
  toggle: () =>
    set(({ theme }) => {
      const next: Theme = theme === 'dark' ? 'light' : 'dark';
      saveTheme(next, storage());
      applyTheme(next, document);
      return { theme: next };
    }),
}));

/** Re-reads storage and system, as a fresh page load would. For tests. */
export function resetTheme() {
  useTheme.setState({ theme: initialTheme() });
}
