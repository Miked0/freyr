import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarChart } from './BarChart';

const plain = (s: string | null) => (s ?? '').replace(/\u00a0/g, ' ');
const data = [
  { label: 'Lazer', value: 50 },
  { label: 'Moradia', value: 200 },
];

describe('BarChart', () => {
  it('draws each bar relative to the largest and flags the largest as alert', () => {
    render(<BarChart data={data} />);
    const list = screen.getByRole('list', { name: 'Gastos por categoria' });
    const [lazer, moradia] = Array.from(list.querySelectorAll('li.fr-bar'));

    expect(plain(lazer.querySelector('.fr-bar-value')!.textContent)).toBe('R$ 50,00');
    expect((lazer.querySelector('.fr-bar-fill') as HTMLElement).style.width).toBe('25%');
    expect(lazer.querySelector('.fr-tag')!.className).toBe('fr-tag');
    expect(moradia.querySelector('.fr-tag')).toHaveClass('fr-tag-alert');
    expect(moradia.querySelector('.fr-bar-fill')).toHaveClass('is-alert');
    expect((moradia.querySelector('.fr-bar-fill') as HTMLElement).style.width).toBe('100%');
  });

  it('honors explicit tones and can skip the highlight', () => {
    render(<BarChart label="Top" highlightMax={false} data={[{ label: 'A', value: 10, tone: 'brand' }, { label: 'B', value: 20 }]} />);
    const [a, b] = Array.from(screen.getByRole('list', { name: 'Top' }).querySelectorAll('.fr-bar-fill'));

    expect(a).toHaveClass('is-brand');
    expect(b.className).toBe('fr-bar-fill');
  });
});
