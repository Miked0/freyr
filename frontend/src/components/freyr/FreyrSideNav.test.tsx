import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FreyrSideNav } from './FreyrSideNav';

// ProfileCard is its own unit; here it only has to receive the logout handler.
vi.mock('./ProfileCard', () => ({
  ProfileCard: ({ onLogout }: { onLogout?: () => void }) => (
    <div data-testid="profile-card">{onLogout ? <button type="button" onClick={onLogout}>Sair</button> : null}</div>
  ),
}));

describe('FreyrSideNav', () => {
  it('links each item to its page', () => {
    render(<FreyrSideNav transactionCount={142} route="overview" />);
    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('href', '#/');
    expect(screen.getByRole('link', { name: /^Transações\s*142/ })).toHaveAttribute('href', '#/transacoes');
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute('href', '#/categorias');
    expect(screen.getByRole('link', { name: 'Metas' })).toHaveAttribute('href', '#/metas');
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('no longer offers an "Importar" item', () => {
    render(<FreyrSideNav transactionCount={0} route="overview" />);
    expect(screen.queryByRole('link', { name: 'Importar' })).not.toBeInTheDocument();
  });

  it.each([
    ['overview', 'Visão geral'],
    ['transactions', /^Transações/],
    ['categories', 'Categorias'],
    ['goals', 'Metas'],
  ] as const)('marks the %s item as the current page', (route, name) => {
    render(<FreyrSideNav transactionCount={3} route={route} />);
    const current = screen.getAllByRole('link').filter(a => a.getAttribute('aria-current') === 'page');
    expect(current).toEqual([screen.getByRole('link', { name })]);
  });

  it('marks no item on the profile page', () => {
    render(<FreyrSideNav transactionCount={3} route="profile" />);
    expect(document.querySelector('[aria-current]')).toBeNull();
  });

  it('does not offer pages that do not exist yet', () => {
    render(<FreyrSideNav transactionCount={0} route="overview" />);
    for (const label of ['Orçamentos', 'Relatórios', 'Configurações', 'Contas', 'Planejamento']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('shows no server or AI status', () => {
    render(<FreyrSideNav transactionCount={0} route="overview" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText(/online|offline|IA/)).not.toBeInTheDocument();
  });

  it('puts the profile card in the footer and hands it the logout', () => {
    const onLogout = vi.fn();
    render(<FreyrSideNav transactionCount={0} route="overview" onLogout={onLogout} />);
    const card = screen.getByTestId('profile-card');
    expect(card.closest('.fr-side-foot')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
