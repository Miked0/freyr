// WCAG 2.x contrast ratio, used by the theme tests to keep both themes at AA.

type Rgba = [number, number, number, number];

/** Parses #rgb, #rrggbb, rgb()/rgba() in comma or space syntax. */
function parse(color: string): Rgba {
  const c = color.trim();
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map(ch => ch + ch).join('') : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const fn = c.match(/^rgba?\(([^)]+)\)$/i);
  if (fn) {
    const [r, g, b, a = 1] = fn[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [r, g, b, a];
  }
  throw new Error(`unsupported color: ${color}`);
}

function luminance([r, g, b]: Rgba): number {
  const [lr, lg, lb] = [r, g, b].map(v => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** Contrast between `foreground` (may be translucent: it is blended over the background) and an opaque `background`. */
export function contrastRatio(foreground: string, background: string): number {
  const bg = parse(background);
  const fg = parse(foreground);
  const a = fg[3];
  const seen: Rgba = [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a)).concat(1) as Rgba;
  const [hi, lo] = [luminance(seen), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Flattens translucent layers into the opaque color you see: the first layer is on top, the last is the opaque base. */
export function blend(...layers: string[]): string {
  const [base, ...above] = layers.map(parse).reverse();
  const seen = above.reduce<Rgba>((under, [r, g, b, a]) => [r * a + under[0] * (1 - a), g * a + under[1] * (1 - a), b * a + under[2] * (1 - a), 1], base);
  return `rgb(${seen.slice(0, 3).map(Math.round).join(' ')})`;
}
