import { useMemo, useState, type KeyboardEvent } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Trash2, Pencil, Download, Check, X, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useExpenses } from '@/store/expenses';
import { formatBRL, formatDate, parseAmountInput, toCsv, type Expense } from '@/lib/finance';
import { categoryColor } from '@/lib/categoryColors';
import { downloadText, todayStamp } from '@/lib/download';
import type { ExpensePatch } from '@/api';

type SortKey = 'date' | 'description' | 'category' | 'amount';

const SORT_LABELS: Record<SortKey, string> = { date: 'Data', description: 'Descrição', category: 'Categoria', amount: 'Valor' };

const signed = (e: Pick<Expense, 'amount' | 'type'>) => (e.type === 'income' ? e.amount : -e.amount);

export function TransactionList() {
  const { expenses, categories: knownCategories, status, error: loadError, load, update, remove } = useExpenses();
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ description: string; amount: string; category: string; type: Expense['type'] }>({ description: '', amount: '', category: '', type: 'expense' });
  const [saving, setSaving] = useState(false);

  const usedCategories = useMemo(() => Array.from(new Set(expenses.map(e => e.category))).sort(), [expenses]);
  const categoryOptions = useMemo(
    () => Array.from(new Set([...knownCategories, ...usedCategories])).sort(),
    [knownCategories, usedCategories]
  );

  const filteredExpenses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return expenses
      .filter(exp => {
        const matchesSearch = !term || exp.description.toLowerCase().includes(term) || exp.category.toLowerCase().includes(term);
        const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
        const matchesDate = (!dateFrom || exp.date >= dateFrom) && (!dateTo || exp.date <= dateTo);
        return matchesSearch && matchesCategory && matchesDate;
      })
      .sort((a, b) => {
        const aVal = sort.key === 'amount' ? signed(a) : a[sort.key];
        const bVal = sort.key === 'amount' ? signed(b) : b[sort.key];
        const order = typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal), 'pt-BR');
        return sort.direction === 'asc' ? order : -order;
      });
  }, [expenses, searchTerm, categoryFilter, dateFrom, dateTo, sort]);

  const handleSort = (key: SortKey) => {
    setSort(prev =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'date' || key === 'amount' ? 'desc' : 'asc' }
    );
  };

  const sortHeader = (key: SortKey, align: 'left' | 'right' = 'left') => {
    const active = sort.key === key;
    const Icon = !active ? ChevronsUpDown : sort.direction === 'asc' ? ChevronUp : ChevronDown;
    return (
      <th scope="col" className={align === 'right' ? '!text-right' : ''} aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}>
        <button
          onClick={() => handleSort(key)}
          className={`inline-flex items-center gap-1 uppercase tracking-[0.06em] cursor-pointer hover:text-text ${active ? 'text-text' : ''}`}
        >
          {SORT_LABELS[key]}
          <Icon className={`h-3.5 w-3.5 ${active ? 'text-brand-primary' : ''}`} aria-hidden="true" />
        </button>
      </th>
    );
  };

  const handleDelete = async (expense: Expense) => {
    if (!window.confirm(`Excluir "${expense.description}" (${formatBRL(expense.amount, expense.type)})?`)) return;
    try {
      setActionError(null);
      await remove([expense.id]);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const handleEditClick = (expense: Expense) => {
    setActionError(null);
    setEditingId(expense.id);
    setEditForm({
      description: expense.description,
      amount: expense.amount.toFixed(2).replace('.', ','),
      category: expense.category,
      type: expense.type,
    });
  };

  const handleSaveEdit = async (expense: Expense) => {
    const amount = parseAmountInput(editForm.amount);
    if (!editForm.description.trim()) {
      setActionError('A descrição não pode ficar vazia.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError('Informe um valor maior que zero.');
      return;
    }

    const patch: ExpensePatch = {};
    if (editForm.description.trim() !== expense.description) patch.description = editForm.description.trim();
    if (amount !== expense.amount) patch.amount = amount;
    if (editForm.category !== expense.category) patch.category = editForm.category;
    if (editForm.type !== expense.type) patch.type = editForm.type;

    if (Object.keys(patch).length === 0) {
      setEditingId(null);
      return;
    }

    setSaving(true);
    try {
      setActionError(null);
      await update(expense.id, patch);
      setEditingId(null);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    downloadText(`transacoes-${todayStamp()}.csv`, '\uFEFF' + toCsv(filteredExpenses), 'text/csv;charset=utf-8');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-ink-muted" role="status">
        <Spinner className="text-brand-primary" />
        <p className="text-sm">Carregando transações…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-5 rounded-2xl bg-alert-soft flex flex-col sm:flex-row sm:items-center gap-3" role="alert">
        <div className="flex items-center gap-3 text-alert">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="font-medium">{loadError}</p>
        </div>
        <Button variant="secondary" size="sm" className="sm:ml-auto" onClick={load}>Tentar novamente</Button>
      </div>
    );
  }

  const hasActiveFilters = Boolean(searchTerm || categoryFilter !== 'all' || dateFrom || dateTo);
  const balance = filteredExpenses.reduce((sum, exp) => sum + signed(exp), 0);
  const onEditKey = (expense: Expense) => (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveEdit(expense);
    if (e.key === 'Escape') setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-end">
        <label>
          <span className="field-label">Buscar</span>
          <span className="relative block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
            <input type="search" placeholder="Descrição ou categoria" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input !pl-10" />
          </span>
        </label>
        <label>
          <span className="field-label">Categoria</span>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input">
            <option value="all">Todas</option>
            {usedCategories.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
          </select>
        </label>
        <label>
          <span className="field-label">De</span>
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} className="input" />
        </label>
        <label>
          <span className="field-label">Até</span>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} className="input" />
        </label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          {hasActiveFilters && (
            <Button variant="ghost" icon={<X className="h-4 w-4" />} onClick={clearFilters}>Limpar</Button>
          )}
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={handleExport} disabled={filteredExpenses.length === 0}>
            CSV
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="p-3 flex flex-wrap items-center gap-3 rounded-xl bg-alert-soft text-alert" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm font-medium flex-1">Não foi possível atualizar a lista: {loadError}</p>
          <Button variant="secondary" size="sm" onClick={load}>Tentar novamente</Button>
        </div>
      )}

      {actionError && (
        <div className="p-3 flex items-center gap-3 rounded-xl bg-alert-soft text-alert" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm font-medium flex-1">{actionError}</p>
          <button type="button" onClick={() => setActionError(null)} className="p-2 -m-2 cursor-pointer hover:opacity-70" aria-label="Fechar aviso">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative overflow-x-auto border-y border-line">
        <table className="data-table min-w-[680px]">
          <thead>
            <tr>
              {sortHeader('date')}
              {sortHeader('description')}
              {sortHeader('category')}
              {sortHeader('amount', 'right')}
              <th scope="col" className="!text-right"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="!py-14 text-center">
                  <p className="font-medium text-lg mb-1">
                    {hasActiveFilters ? 'Nenhuma transação encontrada' : 'Nenhuma transação ainda'}
                  </p>
                  <p className="text-ink-muted mb-4">
                    {hasActiveFilters ? 'Ajuste ou limpe os filtros.' : 'Envie um extrato na seção 01 para começar.'}
                  </p>
                  {hasActiveFilters && <Button variant="secondary" size="sm" onClick={clearFilters}>Limpar filtros</Button>}
                </td>
              </tr>
            ) : (
              filteredExpenses.map(expense => {
                const isEditing = editingId === expense.id;
                return (
                  <tr key={expense.id}>
                    <td className="whitespace-nowrap num text-ink-muted">{formatDate(expense.date)}</td>
                    <td className="max-w-[340px]">
                      {isEditing ? (
                        <input
                          value={editForm.description}
                          onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          className="input !py-2"
                          aria-label="Descrição"
                          onKeyDown={onEditKey(expense)}
                          autoFocus
                        />
                      ) : (
                        <span className="block truncate font-medium" title={expense.description}>{expense.description}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {isEditing ? (
                        <select
                          value={editForm.category}
                          onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                          className="input !py-2 !w-auto"
                          aria-label="Categoria"
                        >
                          {categoryOptions.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                        </select>
                      ) : null}
                      {isEditing ? (
                        <select
                          value={editForm.type}
                          onChange={e => setEditForm(prev => ({ ...prev, type: e.target.value as Expense['type'] }))}
                          className="input !py-2 !w-auto ml-2"
                          aria-label="Tipo"
                        >
                          <option value="expense">Despesa</option>
                          <option value="income">Receita</option>
                        </select>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-sm">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColor(expense.category) }} aria-hidden="true" />
                          {expense.category.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-right font-medium num">
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editForm.amount}
                          onChange={e => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="input !py-2 !w-28 text-right num"
                          aria-label="Valor"
                          onKeyDown={onEditKey(expense)}
                        />
                      ) : (
                        <span className={expense.type === 'income' ? 'text-positive' : ''}>{formatBRL(expense.amount, expense.type)}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-right !py-2">
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <Button size="sm" icon={<Check className="h-4 w-4" />} onClick={() => handleSaveEdit(expense)} loading={saving}>Salvar</Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} disabled={saving} aria-label="Cancelar edição" title="Cancelar">
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEditClick(expense)} aria-label={`Editar ${expense.description}`} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(expense)} aria-label={`Excluir ${expense.description}`} title="Excluir" className="hover:!text-alert">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredExpenses.length > 0 && (
        <div className="pt-4 flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-ink-muted">
            {filteredExpenses.length} de {expenses.length} transações{hasActiveFilters ? ' (filtradas)' : ''}
          </span>
          <span className="text-2xl font-medium tracking-[-0.03em] num">Saldo <span className="marker">{formatBRL(balance, balance >= 0 ? 'income' : 'expense')}</span></span>
        </div>
      )}
    </div>
  );
}

export default TransactionList;