import { describe, it, expect } from 'vitest';
import { findRepeatedImports, type ImportedRow } from './repeated-imports';

let next = 0;
const row = (key: string, sourceFile: string | null, createdAt: string): ImportedRow =>
  ({ id: `e${++next}`, import_key: key, source_file: sourceFile, created_at: createdAt });

describe('findRepeatedImports', () => {
  it('flags the copies saved by uploading the same statement again', () => {
    const first = [row('a', 'extrato.csv', '2026-09-01 10:00:00'), row('b', 'extrato.csv', '2026-09-01 10:00:01')];
    const again = [row('a', 'extrato.csv', '2026-09-03 18:30:00'), row('b', 'extrato.csv', '2026-09-03 18:30:02')];

    expect(findRepeatedImports([...again, ...first])).toEqual(again.map(r => r.id));
  });

  it('flags the copies saved by importing the CSV and the PDF of the same period', () => {
    const csv = row('a', 'extrato.csv', '2026-09-01 10:00:00');
    const pdf = row('a', 'extrato.pdf', '2026-09-01 10:05:00');

    expect(findRepeatedImports([csv, pdf])).toEqual([pdf.id]);
  });

  it('keeps identical purchases that came in the same upload', () => {
    const coffees = [row('cafe', 'fatura.csv', '2026-09-01 10:00:00'), row('cafe', 'fatura.csv', '2026-09-01 10:00:03')];

    expect(findRepeatedImports(coffees)).toEqual([]);
  });

  it('keeps as many copies as the upload that had the most of them', () => {
    const once = row('cafe', 'fatura.csv', '2026-09-01 10:00:00');
    const twice = [row('cafe', 'fatura-2.csv', '2026-09-05 09:00:00'), row('cafe', 'fatura-2.csv', '2026-09-05 09:00:01')];

    expect(findRepeatedImports([once, ...twice])).toEqual([twice[1].id]);
  });

  it('treats one upload that took almost a minute to save as a single upload', () => {
    const slow = [row('x', 'fatura.csv', '2026-09-01 10:00:00'), row('x', 'fatura.csv', '2026-09-01 10:00:58')];

    expect(findRepeatedImports(slow)).toEqual([]);
  });

  it('never flags transactions typed in by hand', () => {
    const typed = [row('a', null, '2026-09-01 10:00:00'), row('a', null, '2026-09-02 10:00:00')];
    const imported = row('a', 'extrato.csv', '2026-09-03 10:00:00');

    expect(findRepeatedImports([...typed, imported])).toEqual([]);
  });

  it('leaves transactions with different keys alone', () => {
    expect(findRepeatedImports([row('a', 'x.csv', '2026-09-01 10:00:00'), row('b', 'y.csv', '2026-09-02 10:00:00')])).toEqual([]);
  });
});
