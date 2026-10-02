import { describe, expect, it } from 'vitest';
import type { Expense } from './finance';
import { recentTransactions, spendingBreakdown, topCategories } from './spending';

let seq = 0;
function entry(date: string, amount: number, category: string, type: Expense['type'] = 'expense', description = category): Expense {
  seq += 1;
  return { id: `x${seq}`, date, amount, description, category, type };
}

describe('spendingBreakdown', () => {
  it('sums the spending of the latest month with spending by category, largest first', () => {
    const rows = [
      entry('2026-08-10', 999, 'Moradia'),
      entry('2026-09-01', 100, 'Alimentação'),
      entry('2026-09-03', 2150, 'Moradia'),
      entry('2026-09-04', 50, 'Alimentação'),
      entry('2026-09-05', 8400, 'Salário', 'income'),
    ];

    expect(spendingBreakdown(rows)).toEqual([
      { label: 'Moradia', value: 2150 },
      { label: 'Alimentação', value: 150 },
    ]);
  });

  it('ignores a later month that only has income', () => {
    const rows = [entry('2026-09-03', 300, 'Lazer'), entry('2026-10-01', 8400, 'Salário', 'income')];

    expect(spendingBreakdown(rows)).toEqual([{ label: 'Lazer', value: 300 }]);
  });

  it('uses the month it is given', () => {
    const rows = [entry('2026-08-10', 999, 'Moradia'), entry('2026-09-03', 10, 'Lazer')];

    expect(spendingBreakdown(rows, '2026-08')).toEqual([{ label: 'Moradia', value: 999 }]);
  });

  it('keeps the four largest categories and folds the rest into "Outros" when there are more than five', () => {
    const rows = [60, 50, 40, 30, 20, 10].map((v, i) => entry('2026-09-0' + (i + 1), v, `C${i}`));

    expect(spendingBreakdown(rows)).toEqual([
      { label: 'C0', value: 60 },
      { label: 'C1', value: 50 },
      { label: 'C2', value: 40 },
      { label: 'C3', value: 30 },
      { label: 'Outros', value: 30 },
    ]);
  });

  it('shows five categories as they are, without "Outros"', () => {
    const rows = [50, 40, 30, 20, 10].map((v, i) => entry('2026-09-0' + (i + 1), v, `C${i}`));

    expect(spendingBreakdown(rows).map(d => d.label)).toEqual(['C0', 'C1', 'C2', 'C3', 'C4']);
  });

  it('is empty when there is no spending', () => {
    expect(spendingBreakdown([])).toEqual([]);
    expect(spendingBreakdown([entry('2026-09-01', 10, 'Salário', 'income')])).toEqual([]);
  });
});

describe('recentTransactions', () => {
  it('lists the latest entries first, signed, with income tagged as "Receita"', () => {
    const rows = [
      entry('2026-09-20', 2150, 'Moradia', 'expense', 'Aluguel'),
      entry('2026-09-24', 284.9, 'Alimentação', 'expense', 'Mercado Central'),
      entry('2026-09-22', 8400, 'Salário', 'income', 'Salário · Studio Norte'),
    ];

    expect(recentTransactions(rows)).toEqual([
      { id: rows[1].id, name: 'Mercado Central', amount: -284.9, category: 'Alimentação', date: '24 set' },
      { id: rows[2].id, name: 'Salário · Studio Norte', amount: 8400, category: 'Receita', date: '22 set' },
      { id: rows[0].id, name: 'Aluguel', amount: -2150, category: 'Moradia', date: '20 set' },
    ]);
  });

  it('keeps only the n most recent, five by default', () => {
    const rows = Array.from({ length: 8 }, (_, i) => entry(`2026-0${i + 1}-15`, 10, 'Lazer'));

    expect(recentTransactions(rows)).toHaveLength(5);
    expect(recentTransactions(rows, 2).map(t => t.date)).toEqual(['15 ago', '15 jul']);
  });

  it('drops the leading zero from the day', () => {
    expect(recentTransactions([entry('2026-01-05', 10, 'Lazer')])[0].date).toBe('5 jan');
  });
});

describe('topCategories', () => {
  it('gives every spending category of the month, largest first', () => {
    const rows = [60, 50, 40, 30, 20, 10].map((v, i) => entry('2026-09-0' + (i + 1), v, `C${i}`));
    rows.push(entry('2026-08-01', 500, 'Antigo'));

    expect(topCategories(rows)).toEqual([60, 50, 40, 30, 20, 10].map((v, i) => ({ label: `C${i}`, value: v })));
    expect(topCategories(rows, '2026-08')).toEqual([{ label: 'Antigo', value: 500 }]);
  });
});
