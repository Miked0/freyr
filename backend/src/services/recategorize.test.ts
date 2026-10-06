import { describe, it, expect } from 'vitest';
import { suggestRecategorizations } from './recategorize';
import { DEFAULT_CATEGORY_NAMES } from './categories';

const row = (id: string, description: string, category = 'Outros') => ({ id, description, category });

describe('suggestRecategorizations', () => {
  it('suggests a category for entries left in Outros that the rules now recognize', () => {
    const suggestions = suggestRecategorizations(
      [
        row('a', 'Compra no débito - Mp *adegar7 Sao Paulo Bra'),
        row('b', 'Debito Online Td - Prot.105901227 Prefixado 2029'),
        row('c', 'SAQUE BANCO 24H - SAQUE BANCO 24H'),
        row('d', 'Compra no débito'),
        row('e', 'Compra no débito - Uber Trip', 'Lazer'),
      ],
      DEFAULT_CATEGORY_NAMES,
      new Set()
    );

    expect(suggestions).toEqual([
      { id: 'a', from: 'Outros', to: 'Alimentação' },
      { id: 'b', from: 'Outros', to: 'Investimentos' },
      { id: 'c', from: 'Outros', to: 'Saques' },
    ]);
  });

  it('moves investment moves filed elsewhere to Investimentos', () => {
    expect(suggestRecategorizations([row('a', 'Resgate - CDB Porq Obj', 'Transferências')], DEFAULT_CATEGORY_NAMES, new Set()))
      .toEqual([{ id: 'a', from: 'Transferências', to: 'Investimentos' }]);
  });

  it('leaves alone what the user put in Outros on purpose', () => {
    const description = 'Compra no débito - Adega Capao Redondo Sao Paulo Bra';
    expect(suggestRecategorizations([row('a', description)], DEFAULT_CATEGORY_NAMES, new Set([description]))).toEqual([]);
  });

  it('only suggests categories the user has', () => {
    expect(suggestRecategorizations([row('a', 'SAQUE BANCO 24H')], ['Outros', 'Mercado'], new Set())).toEqual([]);
  });
});
