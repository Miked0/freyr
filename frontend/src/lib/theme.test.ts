import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyTheme, readTheme, saveTheme, THEME_STORAGE_KEY, type Theme } from './theme';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
}

const brokenStorage = {
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
};

const osPrefers = (dark: boolean) => (query: string) => ({ matches: dark && query === '(prefers-color-scheme: dark)' });

describe('readTheme', () => {
  it('starts light with nothing saved and a light system', () => {
    expect(readTheme(memoryStorage(), osPrefers(false))).toBe('light');
  });

  it('follows a dark system on the first visit', () => {
    expect(readTheme(memoryStorage(), osPrefers(true))).toBe('dark');
  });

  it('prefers the saved choice over the system', () => {
    expect(readTheme(memoryStorage({ [THEME_STORAGE_KEY]: 'dark' }), osPrefers(false))).toBe('dark');
    expect(readTheme(memoryStorage({ [THEME_STORAGE_KEY]: 'light' }), osPrefers(true))).toBe('light');
  });

  it('ignores a saved value that is not a theme', () => {
    expect(readTheme(memoryStorage({ [THEME_STORAGE_KEY]: 'sepia' }), osPrefers(true))).toBe('dark');
  });

  it('falls back to the system when storage is blocked', () => {
    expect(readTheme(brokenStorage, osPrefers(true))).toBe('dark');
    expect(readTheme(brokenStorage, undefined)).toBe('light');
  });
});

describe('saveTheme', () => {
  it('writes the choice under the theme key', () => {
    const storage = memoryStorage();
    saveTheme('dark', storage);
    expect(storage.data.get(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('does not throw when storage is blocked', () => {
    expect(() => saveTheme('dark', brokenStorage)).not.toThrow();
  });
});

describe('applyTheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
    document.head.innerHTML = '';
  });

  it('marks only the root element with the theme', () => {
    applyTheme('dark', document);
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');

    applyTheme('light', document);
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('updates the browser bar color', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#F7F6F3">';
    applyTheme('dark', document);
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#0F0F13');
    applyTheme('light', document);
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#F7F6F3');
  });
});

// Scenario 3 and 4 at page load: the inline script in index.html runs before any CSS or JS bundle.
describe('index.html anti-flash script', () => {
  const html = readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  const script = /<script>([\s\S]*?)<\/script>/.exec(head)?.[1] ?? '';

  function runOnLoad(saved: string | null, osDark: boolean): Theme | undefined {
    const doc = document.implementation.createHTMLDocument();
    doc.head.innerHTML = '<meta name="theme-color" content="#F7F6F3">';
    const storage = memoryStorage(saved ? { [THEME_STORAGE_KEY]: saved } : {});
    new Function('document', 'localStorage', 'matchMedia', script)(doc, storage, osPrefers(osDark));
    return doc.documentElement.dataset.theme as Theme | undefined;
  }

  it('is inline in <head>, before the stylesheets and the app bundle', () => {
    expect(script).not.toBe('');
    expect(head.indexOf('<script>')).toBeLessThan(head.indexOf('<link href="https://fonts'));
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('src="/src/main.tsx"'));
  });

  it('applies a saved dark theme before the first paint', () => {
    expect(runOnLoad('dark', false)).toBe('dark');
  });

  it('adopts a dark system on the first visit', () => {
    expect(runOnLoad(null, true)).toBe('dark');
  });

  it('starts light by default', () => {
    expect(runOnLoad(null, false)).toBe('light');
  });

  it('agrees with readTheme for every saved value and system preference', () => {
    for (const saved of [null, 'dark', 'light', 'sepia']) {
      for (const osDark of [false, true]) {
        const expected = readTheme(memoryStorage(saved ? { [THEME_STORAGE_KEY]: saved } : {}), osPrefers(osDark));
        expect(runOnLoad(saved, osDark), `saved=${saved} osDark=${osDark}`).toBe(expected);
      }
    }
  });
});
