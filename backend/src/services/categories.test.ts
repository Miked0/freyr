import { describe, it, expect } from 'vitest';
import { DEFAULT_CATEGORIES, DEFAULT_CATEGORY_NAMES } from './categories';

const LEGACY_NAMES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer',
  'Compras', 'Contas', 'Educação', 'Salário', 'Investimentos',
  'Transferências', 'Outros',
];

describe('DEFAULT_CATEGORIES', () => {
  it('keeps every category name shipped before, so existing expenses still match', () => {
    expect(DEFAULT_CATEGORY_NAMES).toEqual(expect.arrayContaining(LEGACY_NAMES));
  });

  it('offers between 20 and 24 distinct categories, each with a description', () => {
    expect(DEFAULT_CATEGORIES.length).toBeGreaterThanOrEqual(20);
    expect(DEFAULT_CATEGORIES.length).toBeLessThanOrEqual(24);
    expect(new Set(DEFAULT_CATEGORY_NAMES).size).toBe(DEFAULT_CATEGORIES.length);
    for (const category of DEFAULT_CATEGORIES) expect(category.description).not.toBe('');
  });

  it('ends with the catch-all category', () => {
    expect(DEFAULT_CATEGORY_NAMES[DEFAULT_CATEGORY_NAMES.length - 1]).toBe('Outros');
  });
});
