import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SideNav } from './SideNav';

const sections = [
  {
    title: 'Principal',
    items: [
      { icon: 'overview' as const, label: 'Visão geral', href: '#visao-geral', active: true },
      { icon: 'transactions' as const, label: 'Transações', href: '#transacoes', count: 142 },
      { icon: 'categories' as const, label: 'Categorias' },
    ],
  },
];

describe('SideNav', () => {
  it('renders the brand, section title and anchor items', () => {
    render(<SideNav sections={sections} />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(nav).toHaveClass('fr-side');
    expect(within(nav).getByText('FREYR')).toBeInTheDocument();
    expect(within(nav).getByText('Principal')).toHaveClass('fr-side-title');
    expect(screen.getByRole('link', { name: /^Transações\s*142/ })).toHaveAttribute('href', '#transacoes');
    expect(screen.getByText('142')).toHaveClass('fr-side-count');
  });

  it('marks only the active item as the current page', () => {
    render(<SideNav sections={sections} />);
    const active = screen.getByRole('link', { name: 'Visão geral' });
    expect(active).toHaveClass('fr-side-item', 'is-active');
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Categorias' })).not.toHaveAttribute('aria-current');
  });

  it('falls back to "#" when an item has no href', () => {
    render(<SideNav sections={sections} />);
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute('href', '#');
  });

  it('hides the search by default and shows it on request', () => {
    const { rerender } = render(<SideNav sections={sections} />);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    rerender(<SideNav sections={sections} search />);
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toBeInTheDocument();
  });

  it('renders the footer at the end', () => {
    render(<SideNav sections={sections} footer={<p>rodapé</p>} />);
    expect(screen.getByRole('navigation')).toContainElement(screen.getByText('rodapé'));
  });
});
