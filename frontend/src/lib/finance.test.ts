import { describe, it, expect } from 'vitest';
import { formatChange, formatDate, parseAmountInput, totalsByMonth, totalsByCategory, toCsv, type Expense } from './finance';

const expense = (date: string, amount: number, category = 'Outros', description = 'x'): Expense => ({
  id: `${date}-${amount}`,
  date,
  amount,
  category,
  description,
});

describe('formatDate', () => {
  it('shows the calendar day stored in the ISO date, regardless of timezone', () => {
    expect(formatDate('2026-01-05')).toBe('05/01/2026');
  });
});

describe('totalsByCategory', () => {
  it('ranks categories by total with their share of all spending', () => {
    const categories = totalsByCategory([
      expense('2026-01-01', 25, 'Lazer'),
      expense('2026-01-02', 50, 'Moradia'),
      expense('2026-01-03', 25, 'Lazer'),
    ]);

    expect(categories).toEqual([
      { category: 'Lazer', total: 50, count: 2, share: 0.5 },
      { category: 'Moradia', total: 50, count: 1, share: 0.5 },
    ]);
  });

  it('returns nothing when there are no expenses', () => {
    expect(totalsByCategory([])).toEqual([]);
  });
});

describe('parseAmountInput', () => {
  it('accepts Brazilian and dot-decimal amounts typed by the user', () => {
    expect(['92,50', '1.234,56', '92.50', ' 10 ', 'abc'].map(parseAmountInput)).toEqual([92.5, 1234.56, 92.5, 10, NaN]);
  });
});

describe('formatChange', () => {
  it('shows a signed whole percentage without a negative zero', () => {
    expect([76.4, -12.6, -0.3, 0].map(formatChange)).toEqual(['+76%', '-13%', '0%', '0%']);
  });
});

describe('toCsv', () => {
  it('exports expenses in a spreadsheet-friendly Brazilian format', () => {
    const csv = toCsv([expense('2026-03-15', 1234.5, 'Moradia', 'Aluguel "março"; apto')]);

    expect(csv).toBe('Data;Descrição;Categoria;Valor\r\n15/03/2026;"Aluguel ""março""; apto";Moradia;1234,50');
  });
});

describe('totalsByMonth', () => {
  it('groups expenses by calendar month in chronological order', () => {
    const months = totalsByMonth([
      expense('2026-02-10', 30),
      expense('2025-12-31', 5),
      expense('2026-01-01', 10),
      expense('2026-01-20', 20),
    ]);

    expect(months).toEqual([
      { key: '2025-12', label: 'dez/25', total: 5, count: 1 },
      { key: '2026-01', label: 'jan/26', total: 30, count: 2 },
      { key: '2026-02', label: 'fev/26', total: 30, count: 1 },
    ]);
  });
});
