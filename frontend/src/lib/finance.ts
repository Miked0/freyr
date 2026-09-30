export interface Expense {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
}

export interface MonthTotal {
  key: string;
  label: string;
  total: number;
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

export function formatBRL(amount: number, type?: 'income' | 'expense'): string {
  const sign = type === 'income' ? '+' : type === 'expense' ? '−' : '';
  return `${sign}${currencyFormatter.format(Math.abs(amount))}`;
}

export function formatChange(percent: number): string {
  const rounded = Math.round(percent) || 0;
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

export function parseAmountInput(input: string): number {
  const raw = input.trim();
  if (!/^\d[\d.,]*$/.test(raw)) return NaN;
  return Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw);
}

function csvField(value: string): string {
  return /[;\"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(expenses: Expense[]): string {
  const rows = expenses.map(e =>
    [formatDate(e.date), e.description, e.category, e.amount.toFixed(2).replace('.', ',')].map(csvField).join(';')
  );
  return ['Data;Descrição;Categoria;Valor', ...rows].join('\r\n');
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

export function totalsByCategory(expenses: Expense[]): CategoryTotal[] {
  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = new Map<string, CategoryTotal>();
  for (const { category, amount } of expenses) {
    const entry = byCategory.get(category) ?? { category, total: 0, count: 0, share: 0 };
    entry.total += amount;
    entry.count += 1;
    byCategory.set(category, entry);
  }
  return [...byCategory.values()]
    .map(entry => ({ ...entry, share: entry.total / grandTotal }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}

export function totalsByMonth(expenses: Expense[]): MonthTotal[] {
  const byMonth = new Map<string, MonthTotal>();
  for (const { date, amount, type } of expenses) {
    const key = date.slice(0, 7);
    const month = byMonth.get(key) ?? { key, label: monthLabel(key), total: 0, count: 0, income: 0, expense: 0, balance: 0 };
    month.total += amount;
    month.count += 1;
    if (type === 'income') {
      month.income += amount;
    } else {
      month.expense += amount;
    }
    month.balance = month.income - month.expense;
    byMonth.set(key, month);
  }
  return [...byMonth.values()].sort((a, b) => a.key.localeCompare(b.key));
}