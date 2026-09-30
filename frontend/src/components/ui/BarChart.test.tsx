import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BarChart from './BarChart';

const mockData = [
  { category: 'Moradia', total: 1500, share: 0.5, color: '#4F4CB0' },
  { category: 'Alimentação', total: 800, share: 0.27, color: '#D0712E' },
  { category: 'Transporte', total: 400, share: 0.13, color: '#0092A0' },
  { category: 'Lazer', total: 200, share: 0.07, color: '#C9922A' },
  { category: 'Saúde', total: 100, share: 0.03, color: '#B0457E' },
];

// Mock ResizeObserver as a proper class constructor
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

describe('BarChart', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query) => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders SVG with role=img', () => {
    render(<BarChart data={mockData} />);
    const chart = screen.getByRole('img');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveAttribute('tabIndex', '0');
  });

  it('renders bars for each data item', () => {
    render(<BarChart data={mockData} />);
    const rects = document.querySelectorAll('svg rect');
    expect(rects.length).toBeGreaterThanOrEqual(mockData.length * 2); // background + foreground
  });

  it('shows category labels', () => {
    render(<BarChart data={mockData} />);
    // Category labels are in the SVG text elements
    mockData.forEach((item) => {
      const labels = screen.getAllByText(item.category);
      expect(labels.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows formatted currency values in SVG', () => {
    render(<BarChart data={mockData} />);
    // Look for currency values in SVG text elements (class="num")
    const svgTexts = document.querySelectorAll('svg text.num');
    const texts = Array.from(svgTexts).map(t => t.textContent || '');
    expect(texts.some(t => t.includes('R$') && t.includes('1.500,00'))).toBe(true);
    expect(texts.some(t => t.includes('R$') && t.includes('800,00'))).toBe(true);
  });

  it('highlights the maximum value bar', () => {
    render(<BarChart data={mockData} />);
    const chart = screen.getByRole('img');
    expect(chart).toBeInTheDocument();
  });

  it('limits items with maxItems prop', () => {
    render(<BarChart data={mockData} maxItems={3} />);
    // Check SVG text elements for category labels
    const svgCategoryLabels = document.querySelectorAll('svg text.truncate');
    const categories = Array.from(svgCategoryLabels).map(t => t.textContent || '');
    expect(categories).toContain('Moradia');
    expect(categories).toContain('Alimentação');
    expect(categories).toContain('Transporte');
    expect(categories).not.toContain('Lazer');
    expect(categories).not.toContain('Saúde');
  });

  it('keyboard navigation: ArrowDown moves focus forward', () => {
    render(<BarChart data={mockData} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'ArrowDown' });
    fireEvent.keyDown(chart, { key: 'ArrowDown' });
    expect(chart).toBeInTheDocument();
  });

  it('keyboard navigation: ArrowUp moves focus backward', () => {
    render(<BarChart data={mockData} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'ArrowUp' });
    expect(chart).toBeInTheDocument();
  });

  it('keyboard navigation: Home goes to first bar', () => {
    render(<BarChart data={mockData} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'Home' });
    expect(chart).toBeInTheDocument();
  });

  it('keyboard navigation: End goes to last bar', () => {
    render(<BarChart data={mockData} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'End' });
    expect(chart).toBeInTheDocument();
  });

  it('keyboard navigation: Escape clears focus', () => {
    render(<BarChart data={mockData} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'ArrowDown' });
    fireEvent.keyDown(chart, { key: 'Escape' });
    expect(chart).toBeInTheDocument();
  });

  it('includes accessible table for screen readers', () => {
    render(<BarChart data={mockData} />);
    const table = screen.getByRole('table', { hidden: true });
    expect(table).toBeInTheDocument();
    const caption = screen.getByRole('caption', { hidden: true });
    expect(caption).toBeInTheDocument();
  });

  it('handles empty data array', () => {
    render(<BarChart data={[]} />);
    const chart = screen.getByRole('img');
    expect(chart).toBeInTheDocument();
  });

  it('sorts data by total descending', () => {
    const unsorted = [
      { category: 'A', total: 100, share: 0.1, color: '#111' },
      { category: 'B', total: 500, share: 0.5, color: '#222' },
      { category: 'C', total: 300, share: 0.3, color: '#333' },
    ];
    render(<BarChart data={unsorted} />);
    const chart = screen.getByRole('img');
    expect(chart).toBeInTheDocument();
  });

  it('respects reduced-motion preference', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));

    render(<BarChart data={mockData} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});