import type { CategoryTotal } from './finance';

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
export function pieSlices(totals: CategoryTotal[]): PieSlice[] {
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
