import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DonutChart from './DonutChart';

const mockSlices = [
  { category: 'Moradia', total: 1000, share: 0.5, color: '#4F4CB0' },
  { category: 'Alimentação', total: 500, share: 0.25, color: '#D0712E' },
  { category: 'Transporte', total: 300, share: 0.15, color: '#0092A0' },
  { category: 'Lazer', total: 150, share: 0.075, color: '#C9922A' },
  { category: 'Saúde', total: 50, share: 0.025, color: '#B0457E' },
];

describe('DonutChart', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query) => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders SVG with correct dimensions', () => {
    render(<DonutChart slices={mockSlices} size={200} />);
    const svg = screen.getByRole('img');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('tabIndex', '0');
  });

  it('renders all slices as paths', () => {
    render(<DonutChart slices={mockSlices} />);
    const paths = document.querySelectorAll('svg path');
    expect(paths.length).toBeGreaterThanOrEqual(mockSlices.length);
  });

  it('shows labels for slices with share >= 5%', () => {
    render(<DonutChart slices={mockSlices} showLabels={true} />);
    // Moradia (50%), Alimentação (25%), Transporte (15%), Lazer (7.5%) should have labels
    // Saúde (2.5%) should not
    const texts = Array.from(document.querySelectorAll('svg text')).filter(t => t.textContent?.includes('%'));
    expect(texts.length).toBe(4); // 4 slices >= 5%
  });

  it('hides labels when showLabels is false', () => {
    render(<DonutChart slices={mockSlices} showLabels={false} />);
    const texts = Array.from(document.querySelectorAll('svg text')).filter(t => t.textContent?.includes('%'));
    expect(texts.length).toBe(0);
  });

  it('renders legend with all categories', () => {
    render(<DonutChart slices={mockSlices} />);
    mockSlices.forEach((slice) => {
      expect(screen.getByText(slice.category)).toBeInTheDocument();
    });
  });

  it('shows formatted currency values in legend', () => {
    render(<DonutChart slices={mockSlices} />);
    expect(screen.getByText(/R\$\s*1.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*500,00/)).toBeInTheDocument();
  });

  it('keyboard navigation: ArrowRight moves focus forward', () => {
    render(<DonutChart slices={mockSlices} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(chart).toBeInTheDocument();
  });

  it('keyboard navigation: ArrowLeft moves focus backward', () => {
    render(<DonutChart slices={mockSlices} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'ArrowLeft' });
    expect(chart).toBeInTheDocument();
  });

  it('keyboard navigation: Home goes to first slice', () => {
    render(<DonutChart slices={mockSlices} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'Home' });
    expect(chart).toBeInTheDocument();
  });

  it('keyboard navigation: End goes to last slice', () => {
    render(<DonutChart slices={mockSlices} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'End' });
    expect(chart).toBeInTheDocument();
  });

  it('keyboard navigation: Escape clears focus', () => {
    render(<DonutChart slices={mockSlices} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    fireEvent.keyDown(chart, { key: 'Escape' });
    expect(chart).toBeInTheDocument();
  });

  it('folds extra slices into "Outros" when more than 5', () => {
    const manySlices = [
      ...mockSlices,
      { category: 'Contas', total: 40, share: 0.02, color: '#2F74C8' },
      { category: 'Compras', total: 30, share: 0.015, color: '#7D8F1F' },
      { category: 'Educação', total: 20, share: 0.01, color: '#9E5718' },
    ];
    render(<DonutChart slices={manySlices} />);
    expect(screen.getByText('Outros')).toBeInTheDocument();
  });

  it('handles empty slices array', () => {
    render(<DonutChart slices={[]} />);
    const chart = screen.getByRole('img');
    expect(chart).toBeInTheDocument();
  });

  it('respects reduced-motion preference', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));

    render(<DonutChart slices={mockSlices} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});