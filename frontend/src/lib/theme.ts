// Light "Papel" / dark "Fiorde" theme. The same reading runs inline in index.html before the first paint;
// theme.test.ts checks the two agree.

export type Theme = 'light' | 'dark';
/** What the person picked: a theme, or "auto" to follow the system. */
export type ThemePreference = Theme | 'auto';

export const THEME_STORAGE_KEY = 'freyr:theme';

/** Browser bar color per theme: the `background` token of each. */
const THEME_COLOR: Record<Theme, string> = { light: '#F7F6F3', dark: '#0E1519' };

type ThemeStorage = Pick<Storage, 'getItem' | 'setItem'>;
type MatchMedia = (query: string) => { matches: boolean };

/** The saved choice, else the system preference, else light. */
export function readTheme(storage: ThemeStorage | undefined, matchMedia: MatchMedia | undefined): Theme {
  try {
    const saved = storage?.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage blocked (private mode, cookies off): fall through to the system.
  }
  return matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function saveTheme(theme: Theme, storage: ThemeStorage | undefined): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not saved; the theme still applies for this visit.
  }
}

/** The saved choice, or "auto" when none is saved (the theme then follows the system). */
export function readPreference(storage: ThemeStorage | undefined): ThemePreference {
  try {
    const saved = storage?.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage blocked: nothing was saved.
  }
  return 'auto';
}

/** "auto" forgets the saved theme, which is how index.html and readTheme fall back to the system. */
export function savePreference(preference: ThemePreference, storage: (ThemeStorage & Pick<Storage, 'removeItem'>) | undefined): void {
  if (preference !== 'auto') return saveTheme(preference, storage);
  try {
    storage?.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Not forgotten; the system theme still applies for this visit.
  }
}

/** Marks the root element; the [data-theme] rules in the stylesheets do the rest. */
export function applyTheme(theme: Theme, doc: Document): void {
  const root = doc.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}
