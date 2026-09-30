// Categorical palette validated (dataviz validate_palette.js, light, surface #F7F6F3):
// adjacent CVD ΔE ≥ 8.1, normal-vision ΔE ≥ 15.5. Ochre is < 3:1 contrast, so
// category identity is always paired with a text label (legend / table), never color alone.
const PALETTE = ['#4F4CB0', '#D0712E', '#0092A0', '#C9922A', '#B0457E', '#2F74C8', '#7D8F1F', '#9E5718'];

const SLOTS: Record<string, number> = {
  Moradia: 0,
  Alimentação: 1,
  Transporte: 2,
  Lazer: 3,
  Saúde: 4,
  Contas: 5,
  Compras: 6,
  Outros: 7,
};

export function categoryColor(category: string): string {
  return PALETTE[SLOTS[category] ?? SLOTS.Outros];
}

export interface PieSlice {
  category: string;
  total: number;
  share: number;
  color: string;
}

// Categories without a palette slot would repeat the Outros colour as adjacent,
// indistinguishable slices, so the pie folds them into Outros (the list keeps them apart).
export function pieSlices(totals: { category: string; total: number; count: number; share: number }[]): PieSlice[] {
  const grandTotal = totals.reduce((sum, item) => sum + item.total, 0);
  const merged = new Map<string, number>();
  for (const { category, total } of totals) {
    const key = category in SLOTS ? category : 'Outros';
    merged.set(key, (merged.get(key) ?? 0) + total);
  }
  return [...merged]
    .map(([category, total]) => ({ category, total, share: total / grandTotal, color: categoryColor(category) }))
    .sort((a, b) => b.total - a.total);
}

const WHITE = '#FFFFFF';
const INK = '#1E1C1A';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Label colour for text drawn on top of a slice: whichever of white or ink contrasts more (WCAG).
export function readableTextOn(background: string): string {
  const bg = luminance(background);
  const withWhite = (1 + 0.05) / (bg + 0.05);
  const withInk = (bg + 0.05) / (luminance(INK) + 0.05);
  return withWhite >= withInk ? WHITE : INK;
}