import { describe, expect, it } from 'vitest';
import type { Expense } from './finance';
import { entriesInScope, importedMonths, scopeImpact } from './importScope';

const entry = (id: string, date: string, source_file: string | null): Expense =>
  ({ id, date, amount: 10, description: id, category: 'Outros', type: 'expense', source_file });

const expenses = [
  entry('a1', '2026-07-05', 'a.csv'),
  entry('a2', '2026-08-02', 'a.csv'),
  entry('b1', '2026-08-20', 'b.pdf'),
  entry('c1', '2026-09-01', 'c.pdf'),
  entry('m1', '2026-08-10', null),
];

const ids = (list: Expense[]) => list.map(e => e.id).sort();

describe('entriesInScope', () => {
  it('takes every imported entry and never one typed by hand', () => {
    expect(ids(entriesInScope(expenses, { kind: 'all' }))).toEqual(['a1', 'a2', 'b1', 'c1']);
  });

  it('takes the months in the range, from any statement, in either order', () => {
    expect(ids(entriesInScope(expenses, { kind: 'period', from: '2026-08', to: '2026-08' }))).toEqual(['a2', 'b1']);
    expect(ids(entriesInScope(expenses, { kind: 'period', from: '2026-09', to: '2026-08' }))).toEqual(['a2', 'b1', 'c1']);
  });

  it('takes only the chosen statements', () => {
    expect(ids(entriesInScope(expenses, { kind: 'files', files: ['b.pdf', 'c.pdf'] }))).toEqual(['b1', 'c1']);
    expect(entriesInScope(expenses, { kind: 'files', files: [] })).toEqual([]);
  });
});

describe('scopeImpact', () => {
  it('counts a statement as gone only when none of its entries stay', () => {
    expect(scopeImpact(expenses, { kind: 'period', from: '2026-08', to: '2026-08' })).toEqual({ entries: 2, files: 1 });
    expect(scopeImpact(expenses, { kind: 'all' })).toEqual({ entries: 4, files: 3 });
  });
});

describe('importedMonths', () => {
  it('lists the months with imported entries, oldest first', () => {
    expect(importedMonths(expenses)).toEqual(['2026-07', '2026-08', '2026-09']);
  });
});
