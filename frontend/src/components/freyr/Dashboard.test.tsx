import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';
import { useExpenses } from '@/store/expenses';
import type { Expense } from '@/lib/finance';

// Profile pieces belong to another unit; here they only have to show up in the right place.
vi.mock('./ProfileCard', () => ({
  ProfileCard: ({ onLogout }: { onLogout?: () => void }) => (
    <div data-testid="profile-card">{onLogout ? <button type="button" onClick={onLogout}>Sair</button> : null}</div>
  ),
}));
vi.mock('./pages/ProfilePage', () => ({ ProfilePage: () => <h1>Página de perfil</h1> }));
vi.mock('./pages/GoalsPage', () => ({ GoalsPage: () => <h1>Página de metas</h1> }));
vi.mock('./GoalsCard', () => ({ GoalsCard: () => null }));

const rows: Expense[] = [
  { id: 'a', date: '2026-08-10', amount: 500, description: 'Mercado', category: 'Alimentação', type: 'expense' },
  { id: 'b', date: '2026-09-20', amount: 750, description: 'Aluguel', category: 'Moradia', type: 'expense' },
  { id: 'c', date: '2026-09-05', amount: 8400, description: 'Salário', category: 'Salário', type: 'income' },
];

function go(hash: string) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

const current = () => document.querySelector('nav [aria-current="page"]');

describe('Dashboard', () => {
  beforeEach(() => {
    useExpenses.setState({ expenses: rows, categories: ['Alimentação', 'Moradia'], status: 'ready', error: null });
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    window.location.hash = '';
    vi.restoreAllMocks();
  });

  it('opens on the overview inside the app shell', () => {
    render(<Dashboard />);
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1, name: 'Visão geral financeira' }));
    expect(screen.getByRole('navigation', { name: 'Principal' })).toHaveTextContent('Transações3');
    expect(current()).toHaveTextContent('Visão geral');
    expect(screen.queryByRole('heading', { name: 'Todas as transações' })).not.toBeInTheDocument();
  });

  it('swaps the page when the hash changes and follows it in the nav', () => {
    render(<Dashboard />);

    go('#/transacoes');
    expect(screen.getByRole('heading', { level: 1, name: 'Todas as transações' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Visão geral financeira' })).not.toBeInTheDocument();
    expect(current()).toHaveTextContent('Transações');

    go('#/categorias');
    expect(screen.getByRole('heading', { level: 2, name: 'Todas as categorias' })).toBeInTheDocument();
    expect(current()).toHaveTextContent('Categorias');

    go('#/metas');
    expect(screen.getByRole('heading', { level: 1, name: 'Página de metas' })).toBeInTheDocument();
    expect(current()).toHaveTextContent('Metas');

    go('#/perfil');
    expect(screen.getByRole('heading', { level: 1, name: 'Página de perfil' })).toBeInTheDocument();
    expect(current()).toBeNull();

    go('#/nada');
    expect(screen.getByRole('heading', { level: 1, name: 'Visão geral financeira' })).toBeInTheDocument();
  });

  it('opens the page in the hash it was loaded with', () => {
    window.location.hash = '#/categorias';
    render(<Dashboard />);
    expect(current()).toHaveTextContent('Categorias');
  });

  it('scrolls back to the top when the page changes', () => {
    render(<Dashboard />);
    vi.mocked(window.scrollTo).mockClear();
    go('#/transacoes');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  it('hands the logout to the profile card in the nav', () => {
    const onLogout = vi.fn();
    render(<Dashboard onLogout={onLogout} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
