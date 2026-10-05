import { isInvestment, type Expense } from './finance';

export interface CategorySlice {
  label: string;
  value: number;
}

export interface RecentTransaction {
  id: string;
  name: string;
  /** Signed: income is positive, spending negative. */
  amount: number;
  category: string;
  /** Short day and month, e.g. "24 set". */
  date: string;
}

const MONTH_NAMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MAX_SLICES = 5;

function latestSpendingMonth(expenses: Expense[]): string | undefined {
  let latest: string | undefined;
  for (const e of expenses) {
    if (e.type === 'income' || isInvestment(e)) continue;
    const key = e.date.slice(0, 7);
    if (!latest || key > latest) latest = key;
  }
  return latest;
}

/** Spending per category in a month (the latest month with spending by default), largest first. */
export function topCategories(expenses: Expense[], monthKey?: string): CategorySlice[] {
  const month = monthKey ?? latestSpendingMonth(expenses);
  if (!month) return [];
  const totals = new Map<string, number>();
  for (const e of expenses) {
    if (e.type === 'income' || isInvestment(e) || !e.date.startsWith(month)) continue;
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  }
  return [...totals]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

const OTHERS = 'Outros';

/**
 * The month's spending for a donut: at most five slices, the smallest folded into "Outros". A real "Outros"
 * category takes the folded rest, so it never shows twice.
 */
export function spendingBreakdown(expenses: Expense[], monthKey?: string): CategorySlice[] {
  const all = topCategories(expenses, monthKey);
  if (all.length <= MAX_SLICES) return all;
  const others = all.find(d => d.label === OTHERS);
  const named = all.filter(d => d !== others);
  const kept = named.slice(0, MAX_SLICES - 1);
  const rest = named.slice(MAX_SLICES - 1).reduce((sum, d) => sum + d.value, others?.value ?? 0);
  return [...kept, { label: OTHERS, value: rest }].sort((a, b) => b.value - a.value);
}

function shortDate(isoDate: string): string {
  const [, month, day] = isoDate.slice(0, 10).split('-');
  return `${Number(day)} ${MONTH_NAMES[Number(month) - 1]}`;
}

export function recentTransactions(expenses: Expense[], n = 5): RecentTransaction[] {
  return [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n)
    .map(e => ({
      id: e.id,
      name: e.description,
      amount: e.type === 'income' ? e.amount : -e.amount,
      category: e.type === 'income' ? 'Receita' : e.category,
      date: shortDate(e.date),
    }));
}
