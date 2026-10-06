import { describe, expect, it } from 'vitest';
import { investedTotal, netInvestedFlow, parseAmountInput, percentChange, toCsv, totalsByCategory, totalsByMonth, type Expense } from './finance';

let nextId = 0;
const entry = (date: string, amount: number, category: string, type: Expense['type'] = 'expense', description = 'x'): Expense => ({
  id: String(++nextId), date, amount, category, type, description,
});

describe('totalsByCategory', () => {
  it('ranks spending categories by total and leaves income out of the split', () => {
    const categories = totalsByCategory([
      entry('2026-09-05', 5000, 'Salário', 'income'),
      entry('2026-09-06', 1500, 'Moradia'),
      entry('2026-09-07', 500, 'Alimentação'),
    ]);

    expect(categories.map(c => [c.category, c.total, c.share])).toEqual([
      ['Moradia', 1500, 0.75],
      ['Alimentação', 500, 0.25],
    ]);
  });

  it('leaves money applied in investments out of the split', () => {
    const categories = totalsByCategory([entry('2026-09-06', 1500, 'Moradia'), entry('2026-09-07', 750, 'Investimentos')]);

    expect(categories.map(c => [c.category, c.share])).toEqual([['Moradia', 1]]);
  });

  it('returns nothing when there is only income', () => {
    expect(totalsByCategory([entry('2026-09-05', 5000, 'Salário', 'income')])).toEqual([]);
  });
});

describe('totalsByMonth', () => {
  it('reports spending as the month total and keeps income and balance apart', () => {
    const [september] = totalsByMonth([
      entry('2026-09-05', 5000, 'Salário', 'income'),
      entry('2026-09-06', 1500, 'Moradia'),
      entry('2026-09-20', 580, 'Alimentação'),
    ]);

    expect(september).toMatchObject({ key: '2026-09', total: 2080, expense: 2080, income: 5000, balance: 2920, count: 2 });
  });
});

describe('parseAmountInput', () => {
  it('reads a dot followed by three digits as a thousands separator', () => {
    expect(parseAmountInput('1.234')).toBe(1234);
    expect(parseAmountInput('1.234,56')).toBe(1234.56);
  });

  it('still accepts dot-decimal amounts', () => {
    expect(parseAmountInput('12.5')).toBe(12.5);
    expect(parseAmountInput('12.50')).toBe(12.5);
  });
});

describe('toCsv', () => {
  it('exports the type and signs amounts so income and spending stay apart in a spreadsheet', () => {
    const csv = toCsv([
      entry('2026-03-15', 1234.5, 'Moradia', 'expense', 'Aluguel "março"; apto'),
      entry('2026-03-05', 5000, 'Salário', 'income', 'Salário'),
    ]);

    expect(csv).toBe(
      'Data;Descrição;Categoria;Tipo;Valor\r\n' +
      '15/03/2026;"Aluguel ""março""; apto";Moradia;Despesa;-1234,50\r\n' +
      '05/03/2026;Salário;Salário;Receita;5000,00'
    );
  });
});

describe('percentChange', () => {
  it('compares against the previous amount', () => {
    expect(percentChange(2500, 2000)).toBe(25);
  });

  it('has no comparison when the previous amount is zero', () => {
    expect(percentChange(300, 0)).toBeUndefined();
  });
});

describe('investedTotal', () => {
  const invest = (date: string, amount: number, type: Expense['type'] = 'expense') => entry(date, amount, 'Investimentos', type);
  const moves = [invest('2026-09-10', 100, 'income'), invest('2026-09-25', 750)];

  it('without what the user told, is what was applied minus redeemed, never below zero', () => {
    expect(investedTotal(moves, '2026-09-30')).toBe(650);
    expect(investedTotal(moves, '2026-09-15')).toBe(0);
    expect(netInvestedFlow(moves, '2026-09-15')).toBe(-100);
  });

  it('starts from the amount the user told on that day and follows the moves before and after it', () => {
    const told = { amount: 4000, on: '2026-09-20' };

    expect(investedTotal(moves, '2026-09-30', told)).toBe(4750);
    expect(investedTotal(moves, '2026-09-20', told)).toBe(4000);
    expect(investedTotal(moves, '2026-09-05', told)).toBe(4100);
  });
});
