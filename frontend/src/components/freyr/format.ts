const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** BRL amount with a true minus sign; `signed` also adds "+ " to non-negatives. */
export function money(v: number, signed?: boolean): string {
  const s = brl.format(Math.abs(v));
  if (!signed) return (v < 0 ? '− ' : '') + s;
  return (v < 0 ? '− ' : '+ ') + s;
}

/** Short BRL label for axes and centers: "R$ 5,3k", "R$ 348". */
export function compact(v: number): string {
  if (Math.abs(v) >= 1000) return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k';
  return 'R$ ' + Math.round(v);
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
