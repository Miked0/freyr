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
  if (!month || (income === 0 && expense === 0)) return 'Envie seu primeiro extrato e veja o mês tomar forma.';
  if (income > expense) return `${month} rendeu mais do que saiu. Boa colheita.`;
  if (income < expense) return `${month} saiu mais do que entrou. Dá para virar esse jogo.`;
  return `${month} fechou no zero a zero: entrou o mesmo que saiu.`;
}

/** The one-liner under the title when the cards show the last 30 days. */
export function last30Phrase(income: number, expense: number): string {
  if (income === 0 && expense === 0) return 'Envie seu primeiro extrato e veja o mês tomar forma.';
  if (income > expense) return 'Nos últimos 30 dias sobrou dinheiro. Boa colheita.';
  if (income < expense) return 'Nos últimos 30 dias saiu mais do que entrou. Dá para virar esse jogo.';
  return 'Nos últimos 30 dias tudo o que entrou, saiu. Empate técnico.';
}
