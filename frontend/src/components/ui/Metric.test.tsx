import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Metric from './Metric';
import '@testing-library/jest-dom';

describe('Metric', () => {
  it('renders value with display styling', () => {
    render(<Metric value={1234.56} label="Receita" />);
    const value = screen.getByText(/^\+?1\.234,56$/);
    expect(value).toBeInTheDocument();
    expect(value).toHaveClass('display');
    expect(value).toHaveClass('num');
  });

  it('shows positive sign for positive values', () => {
    render(<Metric value={1000} label="Entrada" />);
    expect(screen.getByText(/\+1\.000,00/)).toBeInTheDocument();
  });

  it('shows negative sign for negative values', () => {
    render(<Metric value={-500} label="Saída" />);
    expect(screen.getByText(/\-500,00/)).toBeInTheDocument();
  });

  it('renders label below value', () => {
    render(<Metric value={100} label="Saldo Total" />);
    expect(screen.getByText(/saldo total/i)).toBeInTheDocument();
  });

  it('renders change with up trend in positive color', () => {
    render(<Metric value={100} label="Teste" change={15.5} trend="up" />);
    const changeContainer = screen.getByLabelText(/aumento de 15.50%/i);
    expect(changeContainer).toBeInTheDocument();
    expect(changeContainer).toHaveClass('text-positive');
    expect(changeContainer.querySelector('svg')).toBeInTheDocument();
  });

  it('renders change with down trend in alert color', () => {
    render(<Metric value={100} label="Teste" change={-8.25} trend="down" />);
    const changeContainer = screen.getByLabelText(/queda de 8.25%/i);
    expect(changeContainer).toBeInTheDocument();
    expect(changeContainer).toHaveClass('text-alert');
    expect(changeContainer.querySelector('svg')).toBeInTheDocument();
  });

  it('infers up trend from positive change when trend not provided', () => {
    render(<Metric value={100} label="Teste" change={10} />);
    const changeContainer = screen.getByLabelText(/aumento de 10.00%/i);
    expect(changeContainer).toHaveClass('text-positive');
    expect(changeContainer.querySelector('svg')).toBeInTheDocument();
  });

  it('infers down trend from negative change when trend not provided', () => {
    render(<Metric value={100} label="Teste" change={-5} />);
    const changeContainer = screen.getByLabelText(/queda de 5.00%/i);
    expect(changeContainer).toHaveClass('text-alert');
    expect(changeContainer.querySelector('svg')).toBeInTheDocument();
  });

  it('does not render change when change is zero', () => {
    render(<Metric value={100} label="Teste" change={0} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('does not render change when change is undefined', () => {
    render(<Metric value={100} label="Teste" />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('does NOT apply trend color to value when only trend is provided (no change)', () => {
    render(<Metric value={100} label="Teste" trend="up" />);
    expect(screen.getByText(/\+100,00/)).toHaveClass('text-text');
  });

  it('formats value with pt-BR locale', () => {
    render(<Metric value={1234567.89} label="Grande valor" />);
    expect(screen.getByText(/\+1\.234\.567,89/)).toBeInTheDocument();
  });
});