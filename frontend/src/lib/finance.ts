export interface Expense {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  /** Name of the statement it came from; absent for entries typed by hand. */
  source_file?: string | null;
}

/** Applying or redeeming investments moves the user's own money: it is neither spending nor income. */
export const INVESTMENT_CATEGORY = 'Investimentos';

export const isInvestment = (e: Pick<Expense, 'category'>) => e.category === INVESTMENT_CATEGORY;

/** The amount the user told they had invested, on the day they told it ("YYYY-MM-DD"). */
export interface InvestedAnchor {
  amount: number;
  on: string;
}

/** Money applied in investments minus what was redeemed, up to `lastDay` ("YYYY-MM-DD") when given. */
export function netInvestedFlow(expenses: Expense[], lastDay?: string): number {
  let net = 0;
  for (const e of expenses) {
    if (!isInvestment(e) || (lastDay && e.date.slice(0, 10) > lastDay)) continue;
    net += e.type === 'income' ? -e.amount : e.amount;
  }
  return net;
}

/**
 * How much is invested at the end of `lastDay`. Statements only show money moving in and out, so the amount the
 * user told is the starting point, moved by what was applied or redeemed between that day and `lastDay`. Without
 * it, the moves alone count, never below zero: redeeming money applied before the first statement is not a debt.
 */
export function investedTotal(expenses: Expense[], lastDay?: string, told?: InvestedAnchor | null): number {
  const net = netInvestedFlow(expenses, lastDay);
  if (!told) return Math.max(0, net);
  return Math.max(0, told.amount + net - netInvestedFlow(expenses, told.on));
}

/** Bills that come back every month, whatever the user does; the rest of the spending is day-to-day. */
export const FIXED_CATEGORIES: readonly string[] = [
  'Moradia', 'Contas', 'Assinaturas', 'Educação', 'Academia e bem-estar', 'Impostos e taxas',
];

export const isFixedBill = (e: Pick<Expense, 'category'>) => FIXED_CATEGORIES.includes(e.category);

export interface MonthTotal {
  key: string;
  label: string;
  /** Spending only; income is reported separately. */
  total: number;
  /** Number of spending entries. */
  count: number;
  income: number;
  expense: number;
  balance: number;
}

const MONTH_NAMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/** With a type, the sign is the effect on the balance: income and refunds (negative spending) show "+". */
export function formatBRL(amount: number, type?: 'income' | 'expense'): string {
  const effect = type === 'income' ? amount : -amount;
  const sign = !type ? '' : effect >= 0 ? '+' : '−';
  return `${sign}${currencyFormatter.format(Math.abs(amount))}`;
}

export function formatChange(percent: number): string {
  const rounded = Math.round(percent) || 0;
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

/** Percent change from previous to current; undefined when there is nothing to compare against. */
export function percentChange(current: number, previous: number): number | undefined {
  return previous > 0 ? ((current - previous) / previous) * 100 : undefined;
}

export function parseAmountInput(input: string): number {
  const raw = input.trim();
  if (!/^\d[\d.,]*$/.test(raw)) return NaN;
  if (raw.includes(',')) return Number(raw.replace(/\./g, '').replace(',', '.'));
  // Brazilian thousands separator ("1.234", "12.345.678"); "12.50" stays a decimal.
  if (/^\d{1,3}(\.\d{3})+$/.test(raw)) return Number(raw.replace(/\./g, ''));
  return Number(raw);
}

function csvField(value: string): string {
  return /[;\"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(expenses: Expense[]): string {
  const rows = expenses.map(e => {
    const signed = e.type === 'income' ? e.amount : -e.amount;
    return [formatDate(e.date), e.description, e.category, e.type === 'income' ? 'Receita' : 'Despesa', signed.toFixed(2).replace('.', ',')]
      .map(csvField)
      .join(';');
  });
  return ['Data;Descrição;Categoria;Tipo;Valor', ...rows].join('\r\n');
}

export function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `${MONTH_NAMES[Number(month) - 1]}/${year.slice(2)}`;
}

export interface CategoryTotal {
  category: string;
  total: number;
  count: number;
  share: number;
}

/** How spending splits across categories; income and investments are left out. */
export function totalsByCategory(expenses: Expense[]): CategoryTotal[] {
  const spending = expenses.filter(e => e.type !== 'income' && !isInvestment(e));
  const grandTotal = spending.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = new Map<string, CategoryTotal>();
  for (const { category, amount } of spending) {
    const entry = byCategory.get(category) ?? { category, total: 0, count: 0, share: 0 };
    entry.total += amount;
    entry.count += 1;
    byCategory.set(category, entry);
  }
  return [...byCategory.values()]
    .map(entry => ({ ...entry, share: grandTotal > 0 ? entry.total / grandTotal : 0 }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}

/** Income and spending per month; investments are left out, so the balance keeps the money invested. */
export function totalsByMonth(expenses: Expense[]): MonthTotal[] {
  const byMonth = new Map<string, MonthTotal>();
  for (const e of expenses) {
    if (isInvestment(e)) continue;
    const { date, amount, type } = e;
    const key = date.slice(0, 7);
    const month = byMonth.get(key) ?? { key, label: monthLabel(key), total: 0, count: 0, income: 0, expense: 0, balance: 0 };
    if (type === 'income') {
      month.income += amount;
    } else {
      month.expense += amount;
      month.total += amount;
      month.count += 1;
    }
    month.balance = month.income - month.expense;
    byMonth.set(key, month);
  }
  return [...byMonth.values()].sort((a, b) => a.key.localeCompare(b.key));
}