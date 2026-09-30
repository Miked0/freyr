import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Trash2, Pencil, X } from 'lucide-react';
import Button from './Button';
import { formatCurrency, formatDate, parseAmountInput, type Expense } from '@/lib/finance';
import { categoryColor } from '@/lib/categoryColors';
import type { ExpensePatch } from '@/api';

type SortKey = 'date' | 'description' | 'category' | 'amount';

interface TransactionListProps {
  expenses: Expense[];
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
  sortable?: boolean;
  knownCategories?: string[];
}

const SORT_LABELS: Record<SortKey, string> = { date: 'Data', description: 'Descrição', category: 'Categoria', amount: 'Valor' };

export default function TransactionList({
  expenses,
  onEdit,
  onDelete,
  sortable = true,
  knownCategories = [],
}: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: '', amount: '', category: '' });

  const usedCategories = useMemo(
    () => Array.from(new Set(expenses.map((e) => e.category))).sort(),
    [expenses]
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set([...knownCategories, ...usedCategories])).sort(),
    [knownCategories, usedCategories]
  );

  const filteredExpenses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return expenses
      .filter((exp) => {
        const matchesSearch =
          !term ||
          exp.description.toLowerCase().includes(term) ||
          exp.category.toLowerCase().includes(term);
        const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        const aVal = a[sort.key];
        const bVal = b[sort.key];
        const order =
          typeof aVal === 'number' && typeof bVal === 'number'
            ? aVal - bVal
            : String(aVal).localeCompare(String(bVal), 'pt-BR');
        return sort.direction === 'asc' ? order : -order;
      });
  }, [expenses, searchTerm, categoryFilter, sort]);

  const handleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'date' || key === 'amount' ? 'desc' : 'asc' }
    );
  };

  const sortHeader = (key: SortKey, align: 'left' | 'right' = 'left') => {
    if (!sortable) return null;
    const active = sort.key === key;
    const Icon = !active ? ChevronsUpDown : sort.direction === 'asc' ? ChevronUp : ChevronDown;
    return (
      <th
        scope="col"
        className={align === 'right' ? '!text-right' : ''}
        aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
      >
        <button
          onClick={() => handleSort(key)}
          className={`inline-flex items-center gap-1 uppercase tracking-[0.06em] cursor-pointer hover:text-text ${
            active ? 'text-text' : ''
          }`}
        >
          {SORT_LABELS[key]}
          <Icon className={`h-3.5 w-3.5 ${active ? 'text-brand-primary' : ''}`} aria-hidden="true" />
        </button>
      </th>
    );
  };

  const handleEditClick = (expense: Expense) => {
    setEditingId(expense.id);
    setEditForm({
      description: expense.description,
      amount: expense.amount.toFixed(2).replace('.', ','),
      category: expense.category,
    });
    onEdit?.(expense);
  };

  const handleSaveEdit = (expense: Expense) => {
    const amount = parseAmountInput(editForm.amount);
    if (!editForm.description.trim()) {
      alert('A descrição não pode ficar vazia.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Informe um valor maior que zero.');
      return;
    }

    const patch: ExpensePatch = {};
    if (editForm.description.trim() !== expense.description) patch.description = editForm.description.trim();
    if (amount !== expense.amount) patch.amount = amount;
    if (editForm.category !== expense.category) patch.category = editForm.category;

    if (Object.keys(patch).length === 0) {
      setEditingId(null);
      return;
    }

    setEditingId(null);
  };

  const handleDelete = (expense: Expense) => {
    if (!window.confirm(`Excluir "${expense.description}" (${formatCurrency(expense.amount)})?`)) return;
    onDelete?.(expense);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
  };

  const hasActiveFilters = Boolean(searchTerm || categoryFilter !== 'all');
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (expenses.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-ink-muted text-center" role="status">
        <p className="font-medium text-lg">Nenhuma despesa ainda</p>
        <p className="text-sm">Envie um extrato para começar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] items-end">
        <label>
          <span className="field-label">Buscar</span>
          <span className="relative block">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              placeholder="Descrição ou categoria"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input !pl-10"
            />
          </span>
        </label>
        <label>
          <span className="field-label">Categoria</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input"
          >
            <option value="all">Todas</option>
            {usedCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          {hasActiveFilters && (
            <Button variant="ghost" icon={<X className="h-4 w-4" />} onClick={clearFilters}>
              Limpar
            </Button>
          )}
        </div>
      </div>

      {filteredExpenses.length === 0 && hasActiveFilters && (
        <div className="py-12 text-center">
          <p className="font-medium text-lg mb-1">Nenhuma despesa encontrada</p>
          <p className="text-ink-muted mb-4">Ajuste ou limpe os filtros.</p>
          <Button variant="secondary" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border-y border-line rounded-xl">
        <table className="data-table min-w-[680px]">
          <thead>
            <tr>
              {sortHeader('date')}
              {sortHeader('description')}
              {sortHeader('category')}
              {sortHeader('amount', 'right')}
              {(onEdit || onDelete) && (
                <th scope="col" className="!text-right">
                  <span className="sr-only">Ações</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((expense) => {
              const isEditing = editingId === expense.id;
              return (
                <tr key={expense.id}>
                  <td className="whitespace-nowrap num text-ink-muted">{formatDate(expense.date)}</td>
                  <td className="max-w-[340px]">
                    {isEditing ? (
                      <input
                        value={editForm.description}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                        className="input !py-2"
                        aria-label="Descrição"
                        autoFocus
                      />
                    ) : (
                      <span className="block truncate font-medium" title={expense.description}>
                        {expense.description}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {isEditing ? (
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                        className="input !py-2 !w-auto"
                        aria-label="Categoria"
                      >
                        {categoryOptions.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-sm">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: categoryColor(expense.category) }}
                          aria-hidden="true"
                        />
                        [ {expense.category} ]
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-right font-medium num">
                    {isEditing ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editForm.amount}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                        className="input !py-2 !w-28 text-right num"
                        aria-label="Valor"
                      />
                    ) : (
                      <>
                        <span className={expense.amount > 0 ? 'text-alert' : 'text-positive'}>
                          {expense.amount > 0 ? '−' : '+'}{formatCurrency(Math.abs(expense.amount))}
                        </span>
                      </>
                    )}
                  </td>
                  {(onEdit || onDelete) && (
                    <td className="whitespace-nowrap text-right !py-2">
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                              onClick={() => handleSaveEdit(expense)}
                            >
                              Salvar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(null)}
                              aria-label="Cancelar edição"
                              title="Cancelar"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </Button>
                          </>
                        ) : (
                          <>
                            {onEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(expense)}
                                aria-label={`Editar ${expense.description}`}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {onDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(expense)}
                                aria-label={`Excluir ${expense.description}`}
                                title="Excluir"
                                className="hover:!text-alert"
                              >
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
            })}
          </tbody>
        </table>
      </div>

      {filteredExpenses.length > 0 && (
        <div className="pt-4 flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-ink-muted">
            {filteredExpenses.length} de {expenses.length} transações{hasActiveFilters ? ' (filtradas)' : ''}
          </span>
          <span className="text-2xl font-medium tracking-[-0.03em] num">
            Total <span className="marker">{formatCurrency(totalAmount)}</span>
          </span>
        </div>
      )}
    </div>
  );
}