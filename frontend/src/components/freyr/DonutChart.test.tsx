import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DonutChart } from './DonutChart';

const plain = (s: string | null) => (s ?? '').replace(/\u00a0/g, ' ');
const data = [
  { label: 'Moradia', value: 750 },
  { label: 'Lazer', value: 250 },
];

describe('DonutChart', () => {
  it('describes the split for screen readers and shows the total in the center', () => {
    const { container } = render(<DonutChart data={data} centerLabel="Saídas" />);

    expect(screen.getByRole('img', { name: 'Distribuição: Moradia 75%, Lazer 25%' })).toBeInTheDocument();
    const center = container.querySelector('.fr-donut-center')!;
    expect(center).toHaveTextContent('[ Saídas ]');
    expect(plain(center.querySelector('b')!.textContent)).toBe('R$ 1k');
    expect(container.querySelectorAll('.fr-donut-seg')).toHaveLength(2);
  });

  it('lists each slice with its value and share, colored with the design tokens', () => {
    const { container } = render(<DonutChart data={data} />);
    const items = container.querySelectorAll('.fr-donut-legend li');

    expect(items).toHaveLength(2);
    expect(plain(items[0].textContent)).toBe('MoradiaR$ 750,0075%');
    expect((items[0].querySelector('.fr-sw') as HTMLElement).style.background).toBe('var(--brand-primary)');
    expect((items[1].querySelector('.fr-sw') as HTMLElement).style.background).toBe('var(--frost)');
  });

  it('focuses a slice when its legend item is hovered or focused', () => {
    const { container } = render(<DonutChart data={data} centerLabel="Saídas" />);
    const lazer = screen.getByText('Lazer', { selector: '.fr-donut-name' }).closest('li')!;

    fireEvent.mouseEnter(lazer);
    expect(lazer).toHaveClass('is-active');
    const center = container.querySelector('.fr-donut-center')!;
    expect(center).toHaveTextContent('[ Lazer ]');
    expect(center.querySelector('small')).toHaveTextContent('25%');
    const segs = container.querySelectorAll('.fr-donut-seg');
    expect(segs[0]).toHaveClass('is-dim');
    expect(segs[1]).toHaveClass('is-active');

    fireEvent.mouseLeave(lazer);
    expect(center).toHaveTextContent('[ Saídas ]');
    fireEvent.focus(lazer);
    expect(lazer).toHaveClass('is-active');
  });
});
