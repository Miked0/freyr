import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesPage } from './CategoriesPage';
import { useExpenses } from '@/store/expenses';
import type { Expense } from '@/lib/finance';

const rows: Expense[] = [
  { id: 'a', date: '2026-09-10', amount: 120.5, description: 'Mercado do bairro', category: 'Alimentação', type: 'expense' },
  { id: 'b', date: '2026-09-12', amount: 79.5, description: 'Padaria', category: 'Alimentação', type: 'expense' },
  { id: 'c', date: '2026-09-20', amount: 1500, description: 'Aluguel', category: 'Moradia', type: 'expense' },
  { id: 'd', date: '2026-09-05', amount: 8400, description: 'Salário', category: 'Salário', type: 'income' },
];

describe('CategoriesPage', () => {
  beforeEach(() => {
    useExpenses.setState({
      expenses: rows,
      categories: ['Alimentação', 'Lazer', 'Moradia', 'Saúde', 'Salário'],
      status: 'ready',
      error: null,
    });
  });

  it('heads the page as Categorias', () => {
    render(<CategoriesPage />);
    expect(screen.getByText('Categorias', { selector: 'b' }).parentElement).toHaveTextContent('Finanças / Categorias');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('shows the spending charts side by side above the list', () => {
    render(<CategoriesPage />);
    const titles = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent);
    expect(titles).toEqual(['Para onde foi', 'Maiores gastos', 'Todas as categorias']);
  });

  it('lists every category with its total and entry count, unspent ones last at R$ 0,00', () => {
    render(<CategoriesPage />);
    const list = screen.getByRole('list', { name: 'Gasto por categoria' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map(li => li.querySelector('.fr-tag')?.textContent)).toEqual([
      '[ Moradia ]', '[ Alimentação ]', '[ Lazer ]', '[ Salário ]', '[ Saúde ]',
    ]);
    expect(items[0]).toHaveTextContent(/R\$\s1\.500,00/);
    expect(items[0]).toHaveTextContent('1 lançamento');
    expect(items[1]).toHaveTextContent(/R\$\s200,00/);
    expect(items[1]).toHaveTextContent('2 lançamentos');
    expect(items[2]).toHaveTextContent(/R\$\s0,00/);
    expect(items[2]).toHaveTextContent('Nenhum lançamento');
  });

  it('also lists a category that has spending but is missing from the saved list', () => {
    useExpenses.setState({ categories: ['Lazer'] });
    render(<CategoriesPage />);
    const list = screen.getByRole('list', { name: 'Gasto por categoria' });
    expect(within(list).getAllByRole('listitem').map(li => li.querySelector('.fr-tag')?.textContent)).toEqual([
      '[ Moradia ]', '[ Alimentação ]', '[ Lazer ]',
    ]);
  });

  it('says so when there are no categories yet', () => {
    useExpenses.setState({ expenses: [], categories: [] });
    render(<CategoriesPage />);
    expect(screen.queryByRole('list', { name: 'Gasto por categoria' })).not.toBeInTheDocument();
    expect(screen.getByText('Suas categorias aparecem quando o primeiro extrato chegar.')).toBeInTheDocument();
  });

  describe('with the account categories loaded', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('ends with the categories the user created', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
        categories: [{ id: 'c1', name: 'Pets da Luna', is_custom: true }],
        custom_limit: 10,
      }))));
      render(<CategoriesPage />);

      expect(await screen.findByRole('heading', { level: 2, name: 'Criadas por você' })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 }).at(-1)).toHaveTextContent('Criadas por você');
    });
  });
});
