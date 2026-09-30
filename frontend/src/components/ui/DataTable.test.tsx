import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DataTable from './DataTable';

const columns = [
  { key: 'id', header: 'ID', sortable: true },
  { key: 'name', header: 'Nome', sortable: true },
  { key: 'value', header: 'Valor', sortable: true, align: 'right' as const },
  { key: 'status', header: 'Status', editable: true, editType: 'select' as const, editOptions: [
    { value: 'active', label: 'Ativo' },
    { value: 'inactive', label: 'Inativo' },
  ]},
];

const data = [
  { id: '1', name: 'Item 1', value: 100, status: 'active' },
  { id: '2', name: 'Item 2', value: 200, status: 'inactive' },
  { id: '3', name: 'Item 3', value: 300, status: 'active' },
];

describe('DataTable', () => {
  it('renders table with headers and data', () => {
    render(<DataTable columns={columns} data={data} getRowId={(row) => row.id} />);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Valor')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('sorts data when sortable column header is clicked', async () => {
    const onSort = vi.fn();
    render(<DataTable columns={columns} data={data} getRowId={(row) => row.id} onSort={onSort} sortable={['name']} />);
    fireEvent.click(screen.getByText('Nome'));
    await waitFor(() => expect(onSort).toHaveBeenCalledWith('name', 'asc'));
  });

  it('toggles sort direction on second click', async () => {
    const onSort = vi.fn();
    render(<DataTable columns={columns} data={data} getRowId={(row) => row.id} onSort={onSort} sortable={['name']} />);
    fireEvent.click(screen.getByText('Nome'));
    fireEvent.click(screen.getByText('Nome'));
    await waitFor(() => expect(onSort).toHaveBeenLastCalledWith('name', 'desc'));
  });

  it('shows empty message when no data', () => {
    render(<DataTable columns={columns} data={[]} getRowId={(row) => row.id} emptyMessage="Nada aqui" />);
    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
  });

  it('enables inline editing when onEdit is provided', async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(<DataTable columns={columns} data={data} getRowId={(row) => row.id} onEdit={onEdit} />);
    // Click edit button (pencil icon) - use aria-label
    const editButtons = screen.getAllByLabelText('Editar');
    fireEvent.click(editButtons[0]);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ativo')).toBeInTheDocument();
    });
  });

  it('calls onEdit with changes when save is clicked', async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(<DataTable columns={columns} data={data} getRowId={(row) => row.id} onEdit={onEdit} />);
    const editButtons = screen.getAllByLabelText('Editar');
    fireEvent.click(editButtons[0]);
    // Change the status via select
    const statusSelect = screen.getByDisplayValue('Ativo');
    fireEvent.change(statusSelect, { target: { value: 'inactive' } });
    // Click save
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(onEdit).toHaveBeenCalledWith('1', { status: 'inactive' }));
  });

  it('calls onDelete when delete button is clicked and confirmed', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<DataTable columns={columns} data={data} getRowId={(row) => row.id} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByLabelText('Excluir');
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('1'));
    vi.restoreAllMocks();
  });

  it('shows export button when onExport provided', () => {
    const onExport = vi.fn();
    render(<DataTable columns={columns} data={data} getRowId={(row) => row.id} onExport={onExport} />);
    expect(screen.getByText('CSV')).toBeInTheDocument();
  });

  it('disables export button when exportDisabled or no data', () => {
    const onExport = vi.fn();
    render(<DataTable columns={columns} data={[]} getRowId={(row) => row.id} onExport={onExport} />);
    expect(screen.getByText('CSV')).toBeDisabled();
  });
});