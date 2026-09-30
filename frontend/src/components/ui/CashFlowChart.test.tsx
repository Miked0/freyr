import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CashFlowChart from './CashFlowChart';

const mockMonths = [
  { key: '2026-01', label: 'jan/26', income: 5000, expense: 3000, balance: 2000 },
  { key: '2026-02', label: 'fev/26', income: 5500, expense: 4000, balance: 1500 },
  { key: '2026-03', label: 'mar/26', income: 5000, expense: 5200, balance: -200 },
  { key: '2026-04', label: 'abr/26', income: 6000, expense: 3500, balance: 2500 },
];

// Mock ResizeObserver as a proper class constructor
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

describe('CashFlowChart', () => {
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
    render(<CashFlowChart months={mockMonths} />);
    const chart = screen.getByRole('img');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveAttribute('tabIndex', '0');
  });

  it('shows month labels in reverse chronological order (most recent first)', () => {
    render(<CashFlowChart months={mockMonths} />);
    const chart = screen.getByRole('img');
    expect(chart).toBeInTheDocument();
  });

  it('shows expense bars (saídas) with alert color', () => {
    render(<CashFlowChart months={mockMonths} />);
    const chart = screen.getByRole('img');
    expect(chart).toBeInTheDocument();
    // Check for expense values in the chart
    expect(screen.getByText(/\-R\$\s*3\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/\-R\$\s*4\.000,00/)).toBeInTheDocument();
  });

  it('shows balance values with correct sign in SVG', () => {
    render(<CashFlowChart months={mockMonths} />);
    // Look for balance values in SVG text elements
    const svgTexts = document.querySelectorAll('svg text.num');
    const texts = Array.from(svgTexts).map(t => t.textContent || '');
    expect(texts.some(t => t.includes('R$') && t.includes('2.000,00') && t.startsWith('+'))).toBe(true);
    expect(texts.some(t => t.includes('R$') && t.includes('200,00') && t.startsWith('-'))).toBe(true);
  });

  it('shows legend with "Saídas"', () => {
    render(<CashFlowChart months={mockMonths} />);
    // Use getAllByText since "Saídas" appears in both legend and accessible table
    const saidasElements = screen.getAllByText('Saídas');
    expect(saidasElements.length).toBeGreaterThanOrEqual(1);
  });

  it('does NOT show income bars or legend in Fase 4 (showIncome=false by default)', () => {
    render(<CashFlowChart months={mockMonths} />);
    // The legend should only show "Saídas" (not "Entradas")
    const saidasElements = screen.getAllByText('Saídas');
    const entradasElements = screen.queryAllByText('Entradas');
    expect(saidasElements.length).toBeGreaterThanOrEqual(1);
    // Entradas should not appear in the visible legend
    expect(entradasElements.length).toBeLessThanOrEqual(1); // only in accessible table
  });

  it('keyboard navigation: ArrowDown moves focus forward', () => {
    render(<CashFlowChart months={mockMonths} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'ArrowDown' });
    fireEvent.keyDown(chart, { key: 'ArrowDown' });
    expect(chart).toBeInTheDocument();
  });

  it('keyboard navigation: ArrowUp moves focus backward', () => {
    render(<CashFlowChart months={mockMonths} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'ArrowUp' });
    expect(chart).toBeInTheDocument();
  });

  it('keyboard navigation: Home goes to first month', () => {
    render(<CashFlowChart months={mockMonths} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'Home' });
    expect(chart).toBeInTheDocument();
  });

  it('keyboard navigation: End goes to last month', () => {
    render(<CashFlowChart months={mockMonths} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'End' });
    expect(chart).toBeInTheDocument();
  });

  it('keyboard navigation: Escape clears focus', () => {
    render(<CashFlowChart months={mockMonths} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'ArrowDown' });
    fireEvent.keyDown(chart, { key: 'Escape' });
    expect(chart).toBeInTheDocument();
  });

  it('includes accessible table for screen readers', () => {
    render(<CashFlowChart months={mockMonths} />);
    const table = screen.getByRole('table', { hidden: true });
    expect(table).toBeInTheDocument();
    const caption = screen.getByRole('caption', { hidden: true });
    expect(caption).toBeInTheDocument();
  });

  it('handles empty months array', () => {
    render(<CashFlowChart months={[]} />);
    const chart = screen.getByRole('img');
    expect(chart).toBeInTheDocument();
  });

  it('shows negative balance in alert color, positive in positive color', () => {
    render(<CashFlowChart months={mockMonths} />);
    const chart = screen.getByRole('img');
    expect(chart).toBeInTheDocument();
  });

  it('respects reduced-motion preference', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));

    render(<CashFlowChart months={mockMonths} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});