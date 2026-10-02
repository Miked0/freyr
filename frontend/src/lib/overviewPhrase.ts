const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Month name for a 'YYYY-MM' key, e.g. '2026-09' → 'Setembro'. */
export function monthName(key: string): string {
  const month = Number(key.slice(5, 7));
  return MONTHS[month - 1] ?? key;
}

/** Long label for a 'YYYY-MM' key, e.g. '2026-09' → 'Setembro 2026'. */
export function monthLongLabel(key: string): string {
  return `${monthName(key)} ${key.slice(0, 4)}`;
}

/** The human one-liner under the overview title, in the README voice. */
export function overviewPhrase(income: number, expense: number, month?: string): string {
  if (!month || (income === 0 && expense === 0)) return 'Envie um extrato para começar.';
  if (income > expense) return `${month} rendeu mais do que saiu. Boa colheita.`;
  if (income < expense) return `${month} saiu mais do que entrou. Hora de ajustar.`;
  return `${month} fechou no zero a zero: entrou o mesmo que saiu.`;
}
