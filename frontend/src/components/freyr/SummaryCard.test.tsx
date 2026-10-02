import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SummaryCard } from './SummaryCard';

describe('SummaryCard', () => {
  it('renders label, sublabel, formatted value, delta and action link', () => {
    const { container } = render(
      <SummaryCard span={4} variant="hero" icon="balance" label="Saldo total" sublabel="Desde o primeiro extrato"
        value={128940.32} delta={4.6} actionLabel="Ver transações" href="#transacoes" />,
    );
    const section = container.firstChild as HTMLElement;
    expect(section.tagName).toBe('SECTION');
    expect(section).toHaveClass('fr-sum', 'is-hero', 'fr-span-4');
    expect(screen.getByRole('heading', { level: 3, name: 'Saldo total' })).toHaveClass('fr-sum-label');
    expect(screen.getByText('Desde o primeiro extrato')).toHaveClass('fr-sum-sub');
    expect(container.querySelector('.fr-sum-value')!.textContent!.replace(/\s/g, ' ')).toBe('R$ 128.940,32');
    expect(container.querySelector('.fr-chip')).toHaveClass('is-good', 'is-hero');
    expect(screen.getByRole('link', { name: 'Ver transações' })).toHaveAttribute('href', '#transacoes');
    expect(container.querySelectorAll('svg.fr-icon')).toHaveLength(2);
  });

  it('inverts the delta for spending and leaves out optional parts', () => {
    const { container } = render(<SummaryCard label="Saídas" value={7420} delta={2.4} invert />);
    expect(container.firstChild).not.toHaveClass('is-hero');
    expect(container.querySelector('.fr-chip')).toHaveClass('is-bad');
    expect(container.querySelector('.fr-sum-sub')).toBeNull();
    expect(container.querySelector('.fr-sum-period')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows no delta chip when the delta is missing, and passes string values through', () => {
    const { container } = render(<SummaryCard label="Entradas" value="—" period="Set" />);
    expect(container.querySelector('.fr-chip')).toBeNull();
    expect(container.querySelector('.fr-sum-value')).toHaveTextContent('—');
    expect(container.querySelector('.fr-sum-period')).toHaveTextContent('Set');
  });

  it('calls onAction and defaults the href', () => {
    const onAction = vi.fn((e: React.MouseEvent) => e.preventDefault());
    render(<SummaryCard label="Entradas" value={1} actionLabel="Ver entradas" onAction={onAction} />);
    const link = screen.getByRole('link', { name: 'Ver entradas' });
    expect(link).toHaveAttribute('href', '#');
    fireEvent.click(link);
    expect(onAction).toHaveBeenCalledOnce();
  });
});
