import { create } from 'zustand';
import { applyTheme, readPreference, readTheme, savePreference, type Theme, type ThemePreference } from './theme';

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
  /** The choice behind `theme`: "auto" follows the system. */
  preference: ThemePreference;
  toggle: () => void;
  set: (theme: Theme) => void;
  choose: (preference: ThemePreference) => void;
}

const DARK_QUERY = '(prefers-color-scheme: dark)';
const systemTheme = (): Theme => (window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light');

function initialTheme(): Theme {
  const theme = readTheme(storage(), systemMedia);
  applyTheme(theme, document);
  return theme;
}

/** App-wide theme. The inline script in index.html already applied it on load; this keeps it in step. */
export const useTheme = create<ThemeState>((set, get) => ({
  theme: initialTheme(),
  preference: readPreference(storage()),
  // The colors glide by themselves: freyr.css transitions the theme tokens on :root.
  toggle: () => get().set(get().theme === 'dark' ? 'light' : 'dark'),
  set: next => get().choose(next),
  choose: preference => {
    const next = preference === 'auto' ? systemTheme() : preference;
    savePreference(preference, storage());
    applyTheme(next, document);
    set({ theme: next, preference });
  },
}));

// On "auto", follow the system when it switches while the app is open.
try {
  window.matchMedia?.(DARK_QUERY).addEventListener?.('change', () => {
    if (useTheme.getState().preference !== 'auto') return;
    const next = systemTheme();
    applyTheme(next, document);
    useTheme.setState({ theme: next });
  });
} catch {
  // No media queries (old browser, tests): the theme stays as chosen.
}

/** Re-reads storage and system, as a fresh page load would. For tests. */
export function resetTheme() {
  useTheme.setState({ theme: initialTheme(), preference: readPreference(storage()) });
}
