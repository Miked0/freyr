import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransactionList from './TransactionList';
import { type Expense } from '@/lib/finance';

const mockExpenses: Expense[] = [
  { id: '1', date: '2026-01-15', amount: 1500, description: 'Aluguel', category: 'Moradia' },
  { id: '2', date: '2026-01-20', amount: 350, description: 'Supermercado', category: 'Alimentação' },
  { id: '3', date: '2026-02-05', amount: 120, description: 'Uber', category: 'Transporte' },
  { id: '4', date: '2026-02-10', amount: 80, description: 'Cinema', category: 'Lazer' },
];

describe('TransactionList', () => {
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

  it('renders table with all expenses', () => {
    render(<TransactionList expenses={mockExpenses} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    mockExpenses.forEach((exp) => {
      expect(screen.getByText(exp.description)).toBeInTheDocument();
    });
    // Category brackets appear once per row
    expect(screen.getAllByText(/\[ Moradia \]/)).toHaveLength(1);
    expect(screen.getAllByText(/\[ Alimentação \]/)).toHaveLength(1);
    expect(screen.getAllByText(/\[ Transporte \]/)).toHaveLength(1);
    expect(screen.getAllByText(/\[ Lazer \]/)).toHaveLength(1);
  });

  it('shows formatted dates', () => {
    render(<TransactionList expenses={mockExpenses} />);
    expect(screen.getByText('15/01/2026')).toBeInTheDocument();
    expect(screen.getByText('20/01/2026')).toBeInTheDocument();
  });

  it('shows formatted currency with minus sign for expenses', () => {
    render(<TransactionList expenses={mockExpenses} />);
    expect(screen.getByText(/−R\$\s*1.500,00/)).toBeInTheDocument();
    expect(screen.getByText(/−R\$\s*350,00/)).toBeInTheDocument();
  });

  it('shows total amount', () => {
    render(<TransactionList expenses={mockExpenses} />);
    // Total text is split across elements: "Total" and "R$ 2.050,00"
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*2.050,00/)).toBeInTheDocument();
  });

  it('shows transaction count', () => {
    render(<TransactionList expenses={mockExpenses} />);
    expect(screen.getByText(/4 de 4 transações/)).toBeInTheDocument();
  });

  it('filters by search term', () => {
    render(<TransactionList expenses={mockExpenses} />);
    const searchInput = screen.getByPlaceholderText('Descrição ou categoria');
    fireEvent.change(searchInput, { target: { value: 'Aluguel' } });
    expect(screen.getByText('Aluguel')).toBeInTheDocument();
    expect(screen.queryByText('Supermercado')).not.toBeInTheDocument();
  });

  it('filters by category', () => {
    render(<TransactionList expenses={mockExpenses} knownCategories={['Moradia', 'Alimentação']} />);
    const categorySelect = screen.getByRole('combobox', { name: /Categoria/i });
    fireEvent.change(categorySelect, { target: { value: 'Moradia' } });
    expect(screen.getByText('Aluguel')).toBeInTheDocument();
    expect(screen.queryByText('Supermercado')).not.toBeInTheDocument();
  });

  it('shows category brackets in table cells', () => {
    render(<TransactionList expenses={mockExpenses} />);
    expect(screen.getByText('[ Moradia ]')).toBeInTheDocument();
    expect(screen.getByText('[ Alimentação ]')).toBeInTheDocument();
  });

  it('shows empty state when no expenses', () => {
    render(<TransactionList expenses={[]} />);
    expect(screen.getByText('Nenhuma despesa ainda')).toBeInTheDocument();
    expect(screen.getByText('Envie um extrato para começar.')).toBeInTheDocument();
  });

  it('shows no results message when filters match nothing', () => {
    render(<TransactionList expenses={mockExpenses} />);
    const searchInput = screen.getByPlaceholderText('Descrição ou categoria');
    fireEvent.change(searchInput, { target: { value: 'Inexistente' } });
    expect(screen.getByText('Nenhuma despesa encontrada')).toBeInTheDocument();
  });

  it('clears filters when clear button clicked', () => {
    render(<TransactionList expenses={mockExpenses} />);
    const searchInput = screen.getByPlaceholderText('Descrição ou categoria');
    fireEvent.change(searchInput, { target: { value: 'Aluguel' } });
    const clearButton = screen.getByText('Limpar');
    fireEvent.click(clearButton);
    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
  });

  it('sorts by date when date header clicked (toggles order)', () => {
    render(<TransactionList expenses={mockExpenses} sortable={true} />);
    const dateHeader = screen.getByRole('button', { name: /Data/i });
    
    // Default is descending (most recent first) - Feb 10
    let rows = screen.getAllByRole('row');
    let firstDataRow = rows[1];
    expect(firstDataRow).toHaveTextContent('10/02/2026');
    
    // Click again to toggle to ascending (oldest first) - Jan 15
    fireEvent.click(dateHeader);
    rows = screen.getAllByRole('row');
    firstDataRow = rows[1];
    expect(firstDataRow).toHaveTextContent('15/01/2026');
  });

  it('sorts by amount when amount header clicked', () => {
    render(<TransactionList expenses={mockExpenses} sortable={true} />);
    const amountHeader = screen.getByRole('button', { name: /Valor/i });
    fireEvent.click(amountHeader);
    // First row should be highest amount (1500)
    const rows = screen.getAllByRole('row');
    const firstDataRow = rows[1];
    expect(firstDataRow).toHaveTextContent('Aluguel');
  });

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    render(<TransactionList expenses={mockExpenses} onEdit={onEdit} />);
    const editButton = screen.getByLabelText(/Editar Aluguel/);
    fireEvent.click(editButton);
    expect(onEdit).toHaveBeenCalledWith(mockExpenses[0]);
  });

  it('calls onDelete when delete button clicked and confirmed', () => {
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<TransactionList expenses={mockExpenses} onDelete={onDelete} />);
    const deleteButton = screen.getByLabelText(/Excluir Aluguel/);
    fireEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith(mockExpenses[0]);
  });

  it('does not call onDelete when cancelled', () => {
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<TransactionList expenses={mockExpenses} onDelete={onDelete} />);
    const deleteButton = screen.getByLabelText(/Excluir Aluguel/);
    fireEvent.click(deleteButton);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('enters edit mode when edit clicked', () => {
    render(<TransactionList expenses={mockExpenses} onEdit={vi.fn()} />);
    const editButton = screen.getByLabelText(/Editar Aluguel/);
    fireEvent.click(editButton);
    expect(screen.getByDisplayValue('Aluguel')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1500,00')).toBeInTheDocument();
    // The edit form's category select has aria-label="Categoria"
    const editCategorySelects = screen.getAllByLabelText('Categoria');
    // Last one should be the edit form's (filter is first)
    expect(editCategorySelects[editCategorySelects.length - 1]).toHaveValue('Moradia');
  });

  it('shows known categories in edit dropdown', () => {
    render(<TransactionList expenses={mockExpenses} knownCategories={['Moradia', 'Alimentação', 'Saúde']} onEdit={vi.fn()} />);
    const editButton = screen.getByLabelText(/Editar Aluguel/);
    fireEvent.click(editButton);
    const editCategorySelects = screen.getAllByLabelText('Categoria');
    const editSelect = editCategorySelects[editCategorySelects.length - 1];
    expect(screen.getByRole('option', { name: 'Saúde' })).toBeInTheDocument();
  });

  it('disables sorting when sortable=false', () => {
    render(<TransactionList expenses={mockExpenses} sortable={false} />);
    // When sortable=false, the header row exists but has no buttons with aria-sort
    const table = screen.getByRole('table');
    const headerRow = table.querySelector('thead tr');
    expect(headerRow).toBeInTheDocument();
    // Headers should be plain th elements without buttons
    const headers = headerRow?.querySelectorAll('th');
    headers?.forEach((th) => {
      expect(th.querySelector('button')).not.toBeInTheDocument();
    });
  });
});