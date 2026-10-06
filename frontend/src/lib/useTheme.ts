import { flushSync } from 'react-dom';
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

/** Where the switch was pressed, in viewport pixels; the new theme spreads from there. */
export interface ThemeOrigin {
  x: number;
  y: number;
}

interface ThemeState {
  theme: Theme;
  toggle: (origin?: ThemeOrigin) => void;
}

const FADE_MS = 420;
let fadeTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Runs the root update with motion: a circle growing from the switch where view transitions exist, else a short
 * cross-fade of every color (the .is-theme-fading rules in freyr.css). Reduced motion swaps at once.
 */
function withTransition(update: () => void, origin: ThemeOrigin | undefined) {
  const root = document.documentElement;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return update();

  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition) {
    const { x, y } = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.style.setProperty('--fr-theme-x', `${x}px`);
    root.style.setProperty('--fr-theme-y', `${y}px`);
    root.style.setProperty('--fr-theme-r', `${Math.ceil(r)}px`);
    doc.startViewTransition(update);
    return;
  }

  root.classList.add('is-theme-fading');
  update();
  clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => root.classList.remove('is-theme-fading'), FADE_MS);
}

function initialTheme(): Theme {
  const theme = readTheme(storage(), systemMedia);
  applyTheme(theme, document);
  return theme;
}

/** App-wide theme. The inline script in index.html already applied it on load; this keeps it in step. */
export const useTheme = create<ThemeState>((set, get) => ({
  theme: initialTheme(),
  toggle: origin => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    saveTheme(next, storage());
    withTransition(() => {
      applyTheme(next, document);
      // Synchronous so the view transition captures the new state, toggle included.
      flushSync(() => set({ theme: next }));
    }, origin);
  },
}));

/** Re-reads storage and system, as a fresh page load would. For tests. */
export function resetTheme() {
  useTheme.setState({ theme: initialTheme() });
}
