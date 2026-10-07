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
  set: (theme: Theme) => void;
}

function initialTheme(): Theme {
  const theme = readTheme(storage(), systemMedia);
  applyTheme(theme, document);
  return theme;
}

/** App-wide theme. The inline script in index.html already applied it on load; this keeps it in step. */
export const useTheme = create<ThemeState>((set, get) => ({
  theme: initialTheme(),
  // The colors glide by themselves: freyr.css transitions the theme tokens on :root.
  toggle: () => get().set(get().theme === 'dark' ? 'light' : 'dark'),
  set: next => {
    saveTheme(next, storage());
    applyTheme(next, document);
    set({ theme: next });
  },
}));

/** Re-reads storage and system, as a fresh page load would. For tests. */
export function resetTheme() {
  useTheme.setState({ theme: initialTheme() });
}
