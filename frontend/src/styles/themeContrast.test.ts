import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { blend, contrastRatio } from '@/lib/contrast';

// WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text and for the parts of a control you need to see
// (input borders, focus rings, chart marks). These checks read the real stylesheets, so a token edit that
// drops below the line fails here before anyone squints at the screen.
const TEXT = 4.5;
const NON_TEXT = 3;

const read = (file: string) => readFileSync(path.resolve(__dirname, file), 'utf8');
const freyrCss = read('./freyr.css');
const indexCss = read('../index.css');

/** The custom properties declared directly in the first block whose selector is exactly `selector`. */
function tokens(css: string, selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = css.match(new RegExp(`(?:^|\\n|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`));
  if (!block) return {};
  const out: Record<string, string> = {};
  for (const [, name, value] of block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[name] = value.trim();
  return out;
}

/** Follows var(--x) references through the given token maps, first map winning. */
function resolver(...maps: Record<string, string>[]) {
  const resolve = (name: string): string => {
    const value = maps.map(m => m[name]).find(v => v !== undefined);
    if (value === undefined) throw new Error(`token ${name} not defined`);
    const ref = value.match(/^var\((--[\w-]+)\)$/);
    return ref ? resolve(ref[1]) : value;
  };
  return resolve;
}

const lightFreyr = tokens(freyrCss, ':root');
const darkFreyr = { ...lightFreyr, ...tokens(freyrCss, ':root[data-theme="dark"]') };
const lightTw = tokens(indexCss, '@theme');

const themes = {
  light: resolver(lightFreyr),
  dark: resolver(darkFreyr),
};

describe.each(Object.entries(themes))('design system tokens, %s theme', (_, t) => {
  const grounds = ['--background', '--surface'];

  it.each(['--ink', '--ink-muted', '--brand-primary', '--positive', '--alert', '--brand-warm-deep', '--link'])(
    '%s is readable as body text on the page and on cards',
    fg => {
      for (const bg of grounds) expect(contrastRatio(t(fg), t(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(TEXT);
    },
  );

  it.each([
    ['--on-brand', '--brand-primary'],
    ['--on-brand', '--brand-primary-hover'],
    ['--on-warm', '--brand-warm'],
    ['--on-hero', '--hero'],
    ['--hero-muted', '--hero'],
    ['--positive-deep', '--positive-soft'],
    ['--alert-deep', '--alert-soft'],
  ])('%s reads on %s', (fg, bg) => {
    expect(contrastRatio(t(fg), t(bg))).toBeGreaterThanOrEqual(TEXT);
  });

  it('draws input and dropzone borders (--line-strong) at 3:1 or more', () => {
    for (const bg of grounds) expect(contrastRatio(t('--line-strong'), t(bg)), `on ${bg}`).toBeGreaterThanOrEqual(NON_TEXT);
  });

  it('keeps chart marks (--bar-neutral, --frost) visible against cards', () => {
    expect(contrastRatio(t('--bar-neutral'), t('--surface'))).toBeGreaterThanOrEqual(NON_TEXT);
    expect(contrastRatio(t('--frost'), t('--surface'))).toBeGreaterThanOrEqual(NON_TEXT);
  });

  it('draws the focus ring in a color that stands out from the page', () => {
    const ring = t('--focus-ring').match(/#[0-9a-fA-F]{6}\s*$/)?.[0];
    expect(ring).toBeDefined();
    for (const bg of grounds) expect(contrastRatio(ring!, t(bg)), `on ${bg}`).toBeGreaterThanOrEqual(NON_TEXT);
  });
});

describe('Tailwind tokens (index.css) used by the transactions, goals and profile pages', () => {
  // Those pages are built from Tailwind utilities (text-ink-muted, bg-surface, .input, .field-label...), which
  // read the --color-* tokens, not the Fiorde ones. In the dark theme they must follow Fiorde inside the app.
  const darkTw = tokens(indexCss, ':root[data-theme="dark"] :is(.fr-app, .fr-modal)');
  const light = resolver(lightTw, lightFreyr);
  const dark = resolver(darkTw, lightTw, darkFreyr);
  const darkGrounds = [darkFreyr['--background'], darkFreyr['--surface']];

  it.each(['--color-text', '--color-ink-muted', '--color-brand-primary', '--color-brand-warm', '--color-positive', '--color-alert'])(
    'dark theme: %s is readable on the Fiorde page and cards',
    fg => {
      for (const bg of darkGrounds) expect(contrastRatio(dark(fg), bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(TEXT);
    },
  );

  it('dark theme: text on the inputs (--color-surface) stays readable', () => {
    expect(contrastRatio(dark('--color-text'), dark('--color-surface'))).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(dark('--color-ink-muted'), dark('--color-surface'))).toBeGreaterThanOrEqual(TEXT);
  });

  it('dark theme: buttons that print --color-surface on a brand fill stay readable', () => {
    for (const fill of ['--color-brand-primary', '--color-alert', '--color-brand-warm']) {
      expect(contrastRatio(dark('--color-surface'), dark(fill)), fill).toBeGreaterThanOrEqual(TEXT);
    }
  });

  it.each([['light', light], ['dark', dark]] as const)('%s theme: form borders (--color-line-strong) reach 3:1', (_, t) => {
    expect(contrastRatio(t('--color-line-strong'), t('--color-surface'))).toBeGreaterThanOrEqual(NON_TEXT);
  });

  it('light theme: Tailwind text tokens stay readable on paper', () => {
    for (const fg of ['--color-text', '--color-ink-muted', '--color-brand-primary', '--color-brand-warm', '--color-positive', '--color-alert']) {
      expect(contrastRatio(light(fg), light('--color-surface')), fg).toBeGreaterThanOrEqual(TEXT);
    }
  });
});

describe('links', () => {
  it('on the dark sign-in panel (.on-text) use the light brand tint, not the 2.7:1 primary', () => {
    const rule = indexCss.match(/\.on-text a\s*\{([^}]*)\}/);
    expect(rule?.[1]).toMatch(/color:\s*var\(--color-brand-primary-light\)/);
    expect(contrastRatio(lightTw['--color-brand-primary-light'], lightTw['--color-text'])).toBeGreaterThanOrEqual(TEXT);
  });
});

describe('backdrop behind the app (sun glow, aurora and fjord ridges)', () => {
  // The page title and the Tailwind pages print text straight on the backdrop, so text must still pass on the
  // darkest spot it can produce: a ridge line drawn over the strongest glow.
  const darkTw = tokens(indexCss, ':root[data-theme="dark"] :is(.fr-app, .fr-modal)');
  const cases = [
    ['light', themes.light, resolver(lightTw, lightFreyr)],
    ['dark', themes.dark, resolver(darkTw, lightTw, darkFreyr)],
  ] as const;

  it.each(cases)('%s theme: text stays at AA where the glows and ridges are strongest', (_, t, tw) => {
    for (const glow of ['--backdrop-glow-a', '--backdrop-glow-b']) {
      const ground = blend(t('--backdrop-ridge'), t(glow), t('--background'));
      for (const fg of ['--ink', '--ink-muted', '--brand-primary', '--link']) {
        expect(contrastRatio(t(fg), ground), `${fg} over ${glow}`).toBeGreaterThanOrEqual(TEXT);
      }
      for (const fg of ['--color-text', '--color-ink-muted']) {
        expect(contrastRatio(tw(fg), ground), `${fg} over ${glow}`).toBeGreaterThanOrEqual(TEXT);
      }
    }
  });

  it('sign-in sky: muted text and form borders hold up under the aurora', () => {
    const tw = resolver(lightTw);
    for (const glow of ['--color-sky-aurora', '--color-sky-frost']) {
      const ground = blend(tw('--color-sky-ridge'), tw(glow), tw('--color-text'));
      expect(contrastRatio(tw('--color-on-text-muted'), ground), glow).toBeGreaterThanOrEqual(TEXT);
      expect(contrastRatio(tw('--color-surface'), ground), glow).toBeGreaterThanOrEqual(TEXT);
      expect(contrastRatio(tw('--color-on-text-control'), ground), glow).toBeGreaterThanOrEqual(NON_TEXT);
    }
  });
});
