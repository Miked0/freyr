import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CashFlowChart } from './CashFlowChart';

const data = [
  { label: 'Jan', income: 5000, expense: 3000 },
  { label: 'Fev', income: 6000, expense: 7000 },
  { label: 'Mar', income: 4000, expense: 2500 },
];

const norm = (s: string | null) => (s ?? '').replace(/\s/g, ' ');

describe('CashFlowChart', () => {
  it('exposes the months as a labelled listbox with accessible options', () => {
    render(<CashFlowChart data={data} />);
    const list = screen.getByRole('listbox', { name: 'Entradas e saídas por mês' });
    expect(list).toHaveAttribute('tabindex', '0');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(norm(options[0].getAttribute('aria-label'))).toBe('Jan: Entradas R$ 5.000,00, Saídas R$ 3.000,00');
  });

  it('selects the highest-income month by default and shows its tooltip and caption', () => {
    const { container } = render(<CashFlowChart data={data} />);
    const list = screen.getByRole('listbox');
    expect(list).toHaveAttribute('aria-activedescendant', 'fr-cf-1');
    expect(screen.getByRole('option', { selected: true })).toHaveClass('fr-cf-col', 'is-active', 'is-odd');
    expect(container.querySelectorAll('.fr-cf-tip')).toHaveLength(1);
    const cap = container.querySelector('figcaption.fr-cf-cap')!;
    expect(norm(cap.textContent)).toBe('Saldo de Fev: − R$ 1.000,00');
    expect(cap.querySelector('b.is-out')).not.toBeNull();
  });

  it('moves the selection with the arrow keys and stops at the ends', () => {
    const { container } = render(<CashFlowChart data={data} defaultIndex={2} />);
    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'ArrowRight' });
    expect(list).toHaveAttribute('aria-activedescendant', 'fr-cf-2');
    fireEvent.keyDown(list, { key: 'ArrowLeft' });
    fireEvent.keyDown(list, { key: 'ArrowLeft' });
    fireEvent.keyDown(list, { key: 'ArrowLeft' });
    expect(list).toHaveAttribute('aria-activedescendant', 'fr-cf-0');
    expect(norm(container.querySelector('.fr-cf-cap')!.textContent)).toBe('Saldo de Jan: + R$ 2.000,00');
    expect(container.querySelector('.fr-cf-tip')).toHaveClass('is-start');
  });

  it('selects a month on hover or click', () => {
    render(<CashFlowChart data={data} defaultIndex={0} />);
    fireEvent.mouseEnter(screen.getAllByRole('option')[2]);
    expect(screen.getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getAllByRole('option')[1]);
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('applies mode, height, custom labels and a nice axis', () => {
    const { container } = render(
      <CashFlowChart data={data} mode="all" height={370} seriesLabels={['Receitas', 'Gastos']} label="Fluxo" />,
    );
    expect(container.querySelector('figure')).toHaveClass('fr-cf', 'is-all');
    expect(container.querySelector('figure')).not.toHaveClass('is-dense');
    expect(container.querySelector('.fr-cf-plot')).toHaveStyle({ height: '370px' });
    expect(screen.getByRole('listbox', { name: 'Fluxo' })).toBeInTheDocument();
    expect(container.querySelector('.fr-cf-legend')).toHaveTextContent('ReceitasGastos');
    const ticks = [...container.querySelectorAll('.fr-cf-axis span')].map(s => s.textContent);
    expect(ticks).toEqual(['R$ 0', 'R$ 2k', 'R$ 4k', 'R$ 6k', 'R$ 8k']);
    expect(container.querySelector('.fr-cf-axis')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('.fr-cf-grid')).toHaveLength(5);
    const bar = container.querySelector('.fr-cf-col .fr-cf-bar.is-a') as HTMLElement;
    expect(bar.style.height).toBe('62.5%');
  });

  it('leaves a step of headroom when the tallest bar lands exactly on a tick', () => {
    const { container } = render(<CashFlowChart data={[{ label: 'Set', income: 3000, expense: 135 }]} />);
    const axis = [...container.querySelectorAll('.fr-cf-axis span')].map(s => s.textContent);
    expect(axis[axis.length - 1]).toBe('R$ 4k');
  });

  it('marks dense charts and renders nothing selected without data', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ label: `M${i}`, income: i, expense: 1 }));
    const { container, unmount } = render(<CashFlowChart data={many} />);
    expect(container.querySelector('figure')).toHaveClass('is-dense');
    unmount();
    const empty = render(<CashFlowChart data={[]} />);
    expect(empty.container.querySelector('figcaption')).toBeNull();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});
