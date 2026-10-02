import { describe, expect, it } from 'vitest';
import { cashFlowSeries, summarizeLast30Days, summarizeOverview } from './overview';
import type { Expense } from './finance';

let seq = 0;
function entry(date: string, amount: number, type: Expense['type'] = 'expense'): Expense {
  return { id: `x${++seq}`, date, amount, description: 'Lançamento', category: 'Outros', type };
}

describe('summarizeOverview', () => {
  it('returns null when there are no entries', () => {
    expect(summarizeOverview([])).toBeNull();
  });

  it('reports the latest month and the running balance of every entry', () => {
    const summary = summarizeOverview([
      entry('2026-08-01', 5000, 'income'),
      entry('2026-08-10', 3000),
      entry('2026-09-01', 6000, 'income'),
      entry('2026-09-15', 4500),
    ]);

    expect(summary).toMatchObject({ monthKey: '2026-09', balance: 3500, income: 6000, expense: 4500 });
  });

  it('reports a chosen month, with the balance up to its end and the month before it', () => {
    const summary = summarizeOverview([
      entry('2026-07-01', 1000, 'income'),
      entry('2026-08-01', 5000, 'income'),
      entry('2026-08-10', 3000),
      entry('2026-09-01', 6000, 'income'),
    ], '2026-08')!;

    expect(summary).toMatchObject({ monthKey: '2026-08', balance: 3000, income: 5000, expense: 3000 });
    expect(summary.incomeDelta).toBeCloseTo(400);
  });

  it('compares the latest month against the previous month with entries', () => {
    const summary = summarizeOverview([
      entry('2026-06-01', 4000, 'income'),
      entry('2026-06-10', 2000),
      // July has no entries: September is compared against June.
      entry('2026-09-01', 5000, 'income'),
      entry('2026-09-15', 3000),
    ])!;

    expect(summary.incomeDelta).toBeCloseTo(25);
    expect(summary.expenseDelta).toBeCloseTo(50);
    // Balance went from 2000 at the end of June to 4000 now.
    expect(summary.balanceDelta).toBeCloseTo(100);
  });

  it('leaves the deltas out when there is only one month', () => {
    const summary = summarizeOverview([entry('2026-09-01', 5000, 'income'), entry('2026-09-02', 100)])!;

    expect(summary.balanceDelta).toBeUndefined();
    expect(summary.incomeDelta).toBeUndefined();
    expect(summary.expenseDelta).toBeUndefined();
  });

  it('leaves the balance delta out when the previous balance was not positive', () => {
    const summary = summarizeOverview([
      entry('2026-08-10', 300),
      entry('2026-09-01', 5000, 'income'),
    ])!;

    expect(summary.balance).toBe(4700);
    expect(summary.balanceDelta).toBeUndefined();
    expect(summary.expenseDelta).toBeCloseTo(-100);
  });
});

describe('cashFlowSeries', () => {
  it('lists the last 12 months with entries, labelled by capitalised month name', () => {
    const entries: Expense[] = [];
    for (let m = 1; m <= 12; m++) entries.push(entry(`2025-${String(m).padStart(2, '0')}-05`, m * 10));
    entries.push(entry('2026-01-05', 1000, 'income'), entry('2026-02-05', 50));

    const series = cashFlowSeries(entries, 'monthly');

    expect(series).toHaveLength(12);
    expect(series[0]).toEqual({ label: 'Mar', income: 0, expense: 30 });
    expect(series.at(-2)).toEqual({ label: 'Jan', income: 1000, expense: 0 });
    expect(series.at(-1)).toEqual({ label: 'Fev', income: 0, expense: 50 });
  });

  it('groups entries by year in the yearly view', () => {
    const series = cashFlowSeries(
      [entry('2025-03-01', 100), entry('2025-11-01', 900, 'income'), entry('2026-02-01', 40), entry('2026-05-01', 60)],
      'yearly',
    );

    expect(series).toEqual([
      { label: '2025', income: 900, expense: 100 },
      { label: '2026', income: 0, expense: 100 },
    ]);
  });

  it('is empty without entries', () => {
    expect(cashFlowSeries([], 'monthly')).toEqual([]);
    expect(cashFlowSeries([], 'yearly')).toEqual([]);
  });
});

describe('summarizeLast30Days', () => {
  const today = new Date('2026-10-02T15:00:00');

  it('returns null when there are no entries', () => {
    expect(summarizeLast30Days([], today)).toBeNull();
  });

  it('adds up the income and spending of the 30 days ending today, whatever their month', () => {
    const summary = summarizeLast30Days([
      entry('2026-09-02', 999, 'income'), // 30 days back: just outside the window
      entry('2026-09-03', 2925.28, 'income'), // first day of the window
      entry('2026-09-20', 460),
      entry('2026-10-01', 93),
    ], today)!;

    expect(summary).toMatchObject({ income: 2925.28, expense: 553, end: '2026-10-02', endsToday: true });
  });

  it('lets a card refund take spending back', () => {
    const summary = summarizeLast30Days([entry('2026-09-20', 460), entry('2026-09-21', -60)], today)!;

    expect(summary.expense).toBe(400);
  });

  it('compares against the 30 days before the window', () => {
    const summary = summarizeLast30Days([
      entry('2026-08-10', 5000, 'income'),
      entry('2026-08-20', 3000),
      entry('2026-09-10', 6000, 'income'),
      entry('2026-09-20', 2700),
    ], today)!;

    expect(summary.incomeDelta).toBeCloseTo(20);
    expect(summary.expenseDelta).toBeCloseTo(-10);
  });

  it('keeps the balance of every entry and compares it with the balance before the window', () => {
    const summary = summarizeLast30Days([
      entry('2026-08-10', 5000, 'income'),
      entry('2026-08-20', 3000),
      entry('2026-09-10', 6000, 'income'),
      entry('2026-09-20', 2700),
    ], today)!;

    expect(summary.balance).toBe(5300);
    expect(summary.balanceDelta).toBeCloseTo(165);
  });

  it('ends the window at the latest entry when nothing happened in the last 30 days', () => {
    const summary = summarizeLast30Days([
      entry('2026-06-10', 4000, 'income'),
      entry('2026-07-15', 1200),
    ], today)!;

    expect(summary).toMatchObject({ income: 0, expense: 1200, end: '2026-07-15', endsToday: false });
  });
});
