import React, { useState, useMemo } from 'react';
import { Check, X, Download, ChevronUp, ChevronDown, ChevronsUpDown, Pencil, Trash2 } from 'lucide-react';
import Button from './Button';
import TextInput from './TextInput';
import SelectInput from './SelectInput';

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'right';
  render?: (value: unknown, row: T) => React.ReactNode;
  editable?: boolean;
  editType?: 'text' | 'number' | 'select';
  editOptions?: SelectOption[];
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onEdit?: (id: string, changes: Partial<T>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  sortable?: string[];
  getRowId: (row: T) => string;
  emptyMessage?: string;
  emptyDescription?: string;
  onExport?: () => void;
  exportDisabled?: boolean;
  exportLabel?: string;
  className?: string;
}

function SortIcon({ key, sortKey, sortDirection, sortable }: { key: string; sortKey: string; sortDirection: 'asc' | 'desc'; sortable: boolean }) {
  if (!sortable) return <span className="w-5" aria-hidden="true" />;
  
  const active = sortKey === key;
  if (!active) return <ChevronsUpDown className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />;
  
  return sortDirection === 'asc' 
    ? <ChevronUp className="h-3.5 w-3.5 text-brand-primary" aria-hidden="true" />
    : <ChevronDown className="h-3.5 w-3.5 text-brand-primary" aria-hidden="true" />;
}

function EditableCell<T>({ 
  value, 
  column, 
  row, 
  rowId, 
  isEditing, 
  editForm, 
  onEditChange, 
  onSave, 
  onCancel,
  saving 
}: {
  value: unknown;
  column: DataTableColumn<T>;
  row: T;
  rowId: string;
  isEditing: boolean;
  editForm: Record<string, unknown>;
  onEditChange: (field: string, value: unknown) => void;
  onSave: (row: T) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  if (!isEditing) return <td>{value as React.ReactNode}</td>;

  const fieldKey = column.key as string;
  const currentValue = editForm[fieldKey] ?? value;

  if (column.editType === 'select' && column.editOptions) {
    return (
      <td>
        <SelectInput
          options={column.editOptions}
          value={currentValue as string}
          onChange={(e) => onEditChange(fieldKey, e.target.value)}
          className="!py-2 !w-auto"
        />
      </td>
    );
  }

  if (column.editType === 'number') {
    return (
      <td className="text-right">
        <input
          type="text"
          inputMode="decimal"
          value={currentValue as string}
          onChange={(e) => onEditChange(fieldKey, e.target.value)}
          className="input !py-2 !w-28 text-right num"
        />
      </td>
    );
  }

  return (
    <td>
      <input
        type="text"
        value={currentValue as string}
        onChange={(e) => onEditChange(fieldKey, e.target.value)}
        className="input !py-2"
        autoFocus
      />
    </td>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onSort,
  onEdit,
  onDelete,
  sortable = [],
  getRowId,
  emptyMessage = 'Nenhum registro encontrado',
  emptyDescription = 'Ajuste ou limpe os filtros.',
  onExport,
  exportDisabled = false,
  exportLabel = 'CSV',
  className = '',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortable.includes(sortKey)) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const order = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal), 'pt-BR');
      return sortDirection === 'asc' ? order : -order;
    });
  }, [data, sortKey, sortDirection, sortable]);

  const handleSort = (key: string) => {
    if (!sortable.includes(key) || !onSort) return;
    
    if (sortKey === key) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
      onSort(key, newDirection);
    } else {
      const newDirection = key === 'date' || key === 'amount' ? 'desc' : 'asc';
      setSortKey(key);
      setSortDirection(newDirection);
      onSort(key, newDirection);
    }
  };

  const handleEditClick = (row: T) => {
    setActionError(null);
    const id = getRowId(row);
    setEditingId(id);
    const initialForm: Record<string, unknown> = {};
    columns.forEach((col) => {
      if (col.editable) {
        initialForm[col.key as string] = row[col.key as string];
      }
    });
    setEditForm(initialForm);
  };

  const handleEditChange = (field: string, value: unknown) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async (row: T) => {
    const id = getRowId(row);
    const changes: Partial<T> = {};
    let hasChanges = false;
    
    columns.forEach((col) => {
      if (col.editable) {
        const fieldKey = col.key as string;
        const newValue = editForm[fieldKey];
        const oldValue = row[fieldKey];
        if (newValue !== oldValue) {
          (changes as Record<string, unknown>)[fieldKey] = newValue;
          hasChanges = true;
        }
      }
    });

    if (!hasChanges) {
      setEditingId(null);
      return;
    }

    setSaving(true);
    try {
      setActionError(null);
      await onEdit?.(id, changes);
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: T) => {
    const id = getRowId(row);
    const description = (row.description as string) || (row.name as string) || id;
    if (!window.confirm(`Excluir "${description}"?`)) return;
    
    try {
      setActionError(null);
      await onDelete?.(id);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  return (
    <div className={className}>
      {actionError && (
        <div className="mb-4 p-3 flex items-center gap-3 rounded-xl bg-alert-soft text-alert" role="alert">
          <span className="flex-shrink-0">!</span>
          <p className="text-sm font-medium flex-1">{actionError}</p>
          <button onClick={() => setActionError(null)} className="cursor-pointer hover:opacity-70" aria-label="Fechar aviso">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="overflow-x-auto border-y border-line">
        <table className="data-table min-w-[680px]">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key as string}
                  scope="col"
                  className={column.align === 'right' ? '!text-right' : ''}
                  aria-sort={
                    sortKey === column.key 
                      ? (sortDirection === 'asc' ? 'ascending' : 'descending') 
                      : undefined
                  }
                >
                  {column.sortable && onSort ? (
                    <button
                      onClick={() => handleSort(column.key as string)}
                      className={`inline-flex items-center gap-1 uppercase tracking-[0.06em] cursor-pointer hover:text-text ${sortKey === column.key ? 'text-text' : ''}`}
                    >
                      {column.header}
                      <SortIcon 
                        key={column.key as string}
                        sortKey={sortKey}
                        sortDirection={sortDirection}
                        sortable={column.sortable}
                      />
                    </button>
                  ) : (
                    <span className="uppercase tracking-[0.06em]">{column.header}</span>
                  )}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th scope="col" className="!text-right">
                  <span className="sr-only">Ações</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + ((onEdit || onDelete) ? 1 : 0)} className="!py-14 text-center">
                  <p className="font-medium text-lg mb-1">{emptyMessage}</p>
                  <p className="text-ink-muted mb-4">{emptyDescription}</p>
                </td>
              </tr>
            ) : (
              sortedData.map((row) => {
                const isEditing = editingId === getRowId(row);
                return (
                  <tr key={getRowId(row)}>
                    {columns.map((column) => {
                      const value = row[column.key as string];
                      const rendered = column.render ? column.render(value, row) : value;
                      
                      if (isEditing && column.editable) {
                        return (
                          <EditableCell
                            key={column.key as string}
                            value={rendered}
                            column={column}
                            row={row}
                            rowId={getRowId(row)}
                            isEditing={isEditing}
                            editForm={editForm}
                            onEditChange={handleEditChange}
                            onSave={handleSaveEdit}
                            onCancel={handleCancelEdit}
                            saving={saving}
                          />
                        );
                      }
                      
                      return (
                        <td key={column.key as string} className={column.align === 'right' ? 'text-right' : ''}>
                          {rendered as React.ReactNode}
                        </td>
                      );
                    })}
                    {(onEdit || onDelete) && (
                      <td className="whitespace-nowrap text-right !py-2">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Button size="sm" icon={<Check className="h-4 w-4" />} onClick={() => handleSaveEdit(row)} loading={saving}>Salvar</Button>
                              <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={saving} aria-label="Cancelar edição" title="Cancelar">
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {onEdit && (
                                <Button variant="ghost" size="sm" onClick={() => handleEditClick(row)} aria-label={`Editar`} title="Editar">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {onDelete && (
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(row)} aria-label={`Excluir`} title="Excluir" className="hover:!text-alert">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {onExport && (
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={onExport} disabled={exportDisabled || data.length === 0}>
            {exportLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default DataTable;