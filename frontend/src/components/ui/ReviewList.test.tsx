import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReviewList from './ReviewList';

const items = [
  { id: '1', date: '2024-01-15', description: 'Supermercado', category: 'ALIMENTAÇÃO', amount: -150.00 },
  { id: '2', date: '2024-01-16', description: 'Salário', category: 'RENDA', amount: 5000.00 },
  { id: '3', date: '2024-01-17', description: 'Transporte', category: 'TRANSPORTE', amount: -50.00 },
];

describe('ReviewList', () => {
  it('renders empty message when no items', () => {
    render(<ReviewList items={[]} />);
    expect(screen.getByText('Nenhum item para revisão')).toBeInTheDocument();
  });

  it('renders all items with date, description, category, and amount', () => {
    render(<ReviewList items={items} />);
    expect(screen.getByText('15/01/2024')).toBeInTheDocument();
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('ALIMENTAÇÃO')).toBeInTheDocument();
    expect(screen.getByText('-R$ 150,00')).toBeInTheDocument();
    expect(screen.getByText('+R$ 5.000,00')).toBeInTheDocument();
  });

  it('shows checkbox for each item', () => {
    render(<ReviewList items={items} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(4); // 3 items + select all
  });

  it('selects individual item and calls onSelectionChange', () => {
    const onSelectionChange = vi.fn();
    render(<ReviewList items={items} onSelectionChange={onSelectionChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First item
    expect(onSelectionChange).toHaveBeenCalledWith(['1']);
  });

  it('selects all items when select all is clicked', () => {
    const onSelectionChange = vi.fn();
    render(<ReviewList items={items} onSelectionChange={onSelectionChange} />);
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);
    expect(onSelectionChange).toHaveBeenCalledWith(['1', '2', '3']);
  });

  it('deselects all when select all is clicked again', () => {
    const onSelectionChange = vi.fn();
    render(<ReviewList items={items} onSelectionChange={onSelectionChange} />);
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox); // Select all
    fireEvent.click(selectAllCheckbox); // Deselect all
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it('shows "Manter selecionados" button when items selected', () => {
    render(<ReviewList items={items} onKeepSelected={vi.fn()} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    expect(screen.getByRole('button', { name: /manter selecionados/i })).toBeInTheDocument();
  });

  it('shows "Descartar tudo" button when items exist', () => {
    render(<ReviewList items={items} onDiscardAll={vi.fn()} />);
    expect(screen.getByRole('button', { name: /descartar tudo/i })).toBeInTheDocument();
  });

  it('calls onKeepSelected when button clicked', () => {
    const onKeepSelected = vi.fn();
    render(<ReviewList items={items} onKeepSelected={onKeepSelected} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    fireEvent.click(screen.getByRole('button', { name: /manter selecionados/i }));
    expect(onKeepSelected).toHaveBeenCalled();
  });

  it('calls onDiscardAll and clears selection when button clicked', () => {
    const onDiscardAll = vi.fn();
    const onSelectionChange = vi.fn();
    render(<ReviewList items={items} onDiscardAll={onDiscardAll} onSelectionChange={onSelectionChange} />);
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);
    fireEvent.click(screen.getByRole('button', { name: /descartar tudo/i }));
    expect(onDiscardAll).toHaveBeenCalled();
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it('displays category in uppercase', () => {
    render(<ReviewList items={items} />);
    expect(screen.getByText('ALIMENTAÇÃO')).toBeInTheDocument();
    expect(screen.getByText('RENDA')).toBeInTheDocument();
    expect(screen.getByText('TRANSPORTE')).toBeInTheDocument();
  });

  it('shows negative amounts in red and positive in green', () => {
    render(<ReviewList items={items} />);
    const expenseAmount = screen.getByText('-R$ 150,00');
    const incomeAmount = screen.getByText('+R$ 5.000,00');
    expect(expenseAmount).toHaveClass('text-alert');
    expect(incomeAmount).toHaveClass('text-positive');
  });
});