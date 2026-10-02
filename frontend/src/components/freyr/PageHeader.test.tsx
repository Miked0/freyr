import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('shows the crumb, title and phrase', () => {
    render(<PageHeader page="Visão geral" title="Visão geral financeira" phrase="Setembro rendeu mais do que saiu. Boa colheita." />);
    expect(screen.getByText('Visão geral', { selector: 'b' }).parentElement).toHaveTextContent('Finanças / Visão geral');
    expect(screen.getByRole('heading', { level: 1, name: 'Visão geral financeira' })).toBeInTheDocument();
    expect(screen.getByText('Setembro rendeu mais do que saiu. Boa colheita.')).toBeInTheDocument();
  });

  it('names the crumb after the page and leaves the phrase out when there is none', () => {
    const { container } = render(<PageHeader page="Categorias" title="Suas categorias" />);
    expect(screen.getByText('Categorias', { selector: 'b' }).parentElement).toHaveTextContent('Finanças / Categorias');
    expect(screen.getByRole('heading', { level: 1, name: 'Suas categorias' })).toBeInTheDocument();
    expect(container.querySelector('.fr-head p')).toBeNull();
  });

  it('wires export as an outline action and offers no import button', () => {
    const onExport = vi.fn();
    render(<PageHeader page="Visão geral" title="t" phrase="x" periodLabel="Setembro 2026" onExport={onExport} />);
    const exportBtn = screen.getByRole('button', { name: 'Exportar' });
    expect(exportBtn).toHaveClass('fr-btn-outline');
    expect(screen.queryByRole('button', { name: /importar/i })).not.toBeInTheDocument();
    expect(document.querySelectorAll('.fr-btn-primary')).toHaveLength(0);
    fireEvent.click(exportBtn);
    expect(onExport).toHaveBeenCalledOnce();
  });

  it('shows the period as an outline label that is not a control', () => {
    render(<PageHeader page="Visão geral" title="t" phrase="x" periodLabel="Setembro 2026" />);
    const period = screen.getByText('Setembro 2026');
    expect(period).toHaveClass('fr-btn', 'fr-btn-outline');
    expect(screen.queryByRole('button', { name: /Setembro 2026/ })).not.toBeInTheDocument();
  });

  it('hides the period and export when there are none', () => {
    render(<PageHeader page="Visão geral" title="t" phrase="Envie um extrato para começar." />);
    expect(document.querySelector('.fr-actions')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Exportar' })).not.toBeInTheDocument();
  });

  it('lets the user pick the period among the given months', () => {
    const onPeriodChange = vi.fn();
    render(<PageHeader page="Visão geral" title="t" periodLabel="Outubro 2026" period="2026-10"
      periods={[{ key: '2026-10', label: 'Outubro 2026' }, { key: '2026-09', label: 'Setembro 2026' }]}
      onPeriodChange={onPeriodChange} />);
    const picker = screen.getByRole('combobox', { name: 'Mês' });
    expect(picker).toHaveValue('2026-10');
    fireEvent.change(picker, { target: { value: '2026-09' } });
    expect(onPeriodChange).toHaveBeenCalledWith('2026-09');
  });
});
