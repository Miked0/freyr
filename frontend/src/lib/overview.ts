import { investedTotal, isInvestment, percentChange, totalsByMonth, type Expense } from './finance';

export interface OverviewSummary {
  /** The latest month with entries, as "YYYY-MM". */
  monthKey: string;
  /** Running balance of every entry (income minus spending); money invested is still part of it. */
  balance: number;
  /** How much of the balance sits in investments at the end of the month. */
  invested: number;
  /** Change of the running balance against the end of the previous month with entries. */
  balanceDelta?: number;
  income: number;
  incomeDelta?: number;
  expense: number;
  expenseDelta?: number;
}

export interface Last30DaysSummary {
  /** Last day of the window, "YYYY-MM-DD": today, or the latest entry when nothing happened in the last 30 days. */
  end: string;
  endsToday: boolean;
  /** Balance of every entry up to the end of the window. */
  balance: number;
  /** How much of the balance sits in investments at the end of the window. */
  invested: number;
  /** Change of the balance against the day before the window. */
  balanceDelta?: number;
  income: number;
  incomeDelta?: number;
  expense: number;
  expenseDelta?: number;
}

export interface CashFlowPoint {
  label: string;
  income: number;
  expense: number;
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Summary of `monthKey` ("YYYY-MM"), or of the latest month with entries when it is omitted or has none. */
export function summarizeOverview(expenses: Expense[], monthKey?: string): OverviewSummary | null {
  const all = totalsByMonth(expenses);
  const index = all.findIndex(m => m.key === monthKey);
  const months = index === -1 ? all : all.slice(0, index + 1);
  const current = months.at(-1);
  if (!current) return null;
  const previous = months.at(-2);
  const balance = months.reduce((sum, m) => sum + m.balance, 0);

  return {
    monthKey: current.key,
    balance,
    invested: investedTotal(expenses, `${current.key}-31`),
    balanceDelta: previous ? percentChange(balance, balance - current.balance) : undefined,
    income: current.income,
    incomeDelta: previous ? percentChange(current.income, previous.income) : undefined,
    expense: current.expense,
    expenseDelta: previous ? percentChange(current.expense, previous.expense) : undefined,
  };
}

const WINDOW_DAYS = 30;

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The day `days` before (or after, when negative) a "YYYY-MM-DD" day. */
function shiftDay(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function totalsBetween(expenses: Expense[], first: string, last: string) {
  let income = 0;
  let expense = 0;
  for (const e of expenses) {
    const day = e.date.slice(0, 10);
    if (day < first || day > last || isInvestment(e)) continue;
    if (e.type === 'income') income += e.amount;
    else expense += e.amount;
  }
  return { income, expense };
}

/**
 * Income and spending of the 30 days ending today, across month boundaries, so an import that ends on the
 * 1st does not show an empty month. With nothing in that window, it ends at the latest entry instead.
 */
export function summarizeLast30Days(expenses: Expense[], today: Date = new Date()): Last30DaysSummary | null {
  if (expenses.length === 0) return null;
  const todayKey = isoDay(today);
  const latest = expenses.reduce((max, e) => (e.date.slice(0, 10) > max ? e.date.slice(0, 10) : max), '');
  const recent = expenses.some(e => {
    const day = e.date.slice(0, 10);
    return day > shiftDay(todayKey, WINDOW_DAYS) && day <= todayKey;
  });
  const end = recent ? todayKey : latest;
  const start = shiftDay(end, WINDOW_DAYS - 1);

  const current = totalsBetween(expenses, start, end);
  const previous = totalsBetween(expenses, shiftDay(start, WINDOW_DAYS), shiftDay(start, 1));
  const before = totalsBetween(expenses, '', shiftDay(start, 1));
  const balanceBefore = before.income - before.expense;
  const balance = balanceBefore + current.income - current.expense;

  return {
    end,
    endsToday: end === todayKey,
    balance,
    invested: investedTotal(expenses, end),
    balanceDelta: percentChange(balance, balanceBefore),
    income: current.income,
    incomeDelta: percentChange(current.income, previous.income),
    expense: current.expense,
    expenseDelta: percentChange(current.expense, previous.expense),
  };
}

export function cashFlowSeries(expenses: Expense[], view: 'monthly' | 'yearly'): CashFlowPoint[] {
  const months = totalsByMonth(expenses);
  if (view === 'monthly') {
    return months.slice(-12).map(m => ({
      label: MONTH_LABELS[Number(m.key.slice(5, 7)) - 1],
      income: m.income,
      expense: m.expense,
    }));
  }
  const byYear = new Map<string, CashFlowPoint>();
  for (const m of months) {
    const label = m.key.slice(0, 4);
    const year = byYear.get(label) ?? { label, income: 0, expense: 0 };
    year.income += m.income;
    year.expense += m.expense;
    byYear.set(label, year);
  }
  return [...byYear.values()];
}
