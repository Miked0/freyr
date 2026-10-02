import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FreyrSideNav } from './FreyrSideNav';

const online = { state: 'online', health: { status: 'ok', ai: 'nvidia' } } as const;

describe('FreyrSideNav', () => {
  it('links to the sections that exist on the page', () => {
    render(<FreyrSideNav transactionCount={142} health={online} />);
    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('href', '#visao-geral');
    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Importar' })).toHaveAttribute('href', '#importar');
    expect(screen.getByRole('link', { name: /^Transações\s*142/ })).toHaveAttribute('href', '#transacoes');
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute('href', '#categorias');
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('does not offer pages that do not exist yet', () => {
    render(<FreyrSideNav transactionCount={0} health={online} />);
    for (const label of ['Orçamentos', 'Metas', 'Relatórios', 'Configurações', 'Contas', 'Planejamento']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it.each([
    [{ state: 'checking' } as const, 'Verificando…'],
    [{ state: 'offline' } as const, 'Servidor offline'],
    [online, 'Online · IA ativa'],
    [{ state: 'online', health: { status: 'ok', ai: 'keywords' } } as const, 'Online · sem IA'],
  ])('reports the server state %#', (health, label) => {
    render(<FreyrSideNav transactionCount={0} health={health} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('shows "Sair" only when logout is available', () => {
    const onLogout = vi.fn();
    const { rerender } = render(<FreyrSideNav transactionCount={0} health={online} />);
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument();
    rerender(<FreyrSideNav transactionCount={0} health={online} onLogout={onLogout} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
