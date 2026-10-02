import { describe, it, expect } from 'vitest';
import { importKey, splitAlreadyImported } from './import-key';

const t = (description: string, amount = 10, date = '2026-03-15', type: 'income' | 'expense' = 'expense') =>
  ({ date, amount, description, type });

describe('importKey', () => {
  it('ignores case, accents and repeated spaces in the description', () => {
    expect(importKey(t('Farmácia  Pague Menos '))).toBe(importKey(t('FARMACIA PAGUE MENOS')));
  });

  it('tells apart date, amount, direction and description', () => {
    const base = importKey(t('UBER'));
    expect(importKey(t('UBER', 10, '2026-03-16'))).not.toBe(base);
    expect(importKey(t('UBER', 10.01))).not.toBe(base);
    expect(importKey(t('UBER', 10, '2026-03-15', 'income'))).not.toBe(base);
    expect(importKey(t('UBER X'))).not.toBe(base);
  });

  it('treats 10 and 10.00 as the same amount', () => {
    expect(importKey(t('UBER', 10))).toBe(importKey(t('UBER', 10.0)));
  });
});

describe('splitAlreadyImported', () => {
  it('skips as many copies of a transaction as are already saved', () => {
    const coffee = t('CAFE', 8);
    const saved = new Map([[importKey(coffee), 1]]);

    const { fresh, duplicates } = splitAlreadyImported([coffee, coffee, t('PAO', 5)], saved);

    expect(fresh).toEqual([coffee, t('PAO', 5)]);
    expect(duplicates).toBe(1);
  });
});
