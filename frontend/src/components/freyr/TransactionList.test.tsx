import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TransactionList } from './TransactionList';

const plain = (s: string | null) => (s ?? '').replace(/\u00a0/g, ' ');

describe('TransactionList', () => {
  it('shows name, signed amount, category tag and date for each entry', () => {
    const { container } = render(
      <TransactionList
        items={[
          { name: 'Mercado Central', amount: -284.9, category: 'Alimentação', date: '24 set' },
          { name: 'Salário', amount: 8400, category: 'Receita', date: '22 set' },
        ]}
      />,
    );
    const rows = container.querySelectorAll('ul.fr-tx > li');

    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('.fr-tx-name')).toHaveTextContent('Mercado Central');
    expect(plain(rows[0].querySelector('.fr-tx-amount')!.textContent)).toBe('− R$ 284,90');
    expect(rows[0].querySelector('.fr-tx-amount')).not.toHaveClass('is-in');
    expect(rows[0].querySelector('.fr-tx-meta .fr-tag-muted')).toHaveTextContent('[ Alimentação ]');
    expect(rows[0].querySelector('.fr-tx-meta')).toHaveTextContent('24 set');
    expect(plain(rows[1].querySelector('.fr-tx-amount')!.textContent)).toBe('+ R$ 8.400,00');
    expect(rows[1].querySelector('.fr-tx-amount')).toHaveClass('is-in');
  });
});
