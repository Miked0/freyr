import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import Button from './Button';

export interface ReviewItem {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
}

export interface ReviewListProps {
  items: ReviewItem[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onKeepSelected?: () => void;
  onDiscardAll?: () => void;
  emptyMessage?: string;
  className?: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
};

const formatDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

const ReviewList = ({
  items,
  onSelectionChange,
  onKeepSelected,
  onDiscardAll,
  emptyMessage = 'Nenhum item para revisão',
  className = '',
}: ReviewListProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [indeterminate, setIndeterminate] = useState(false);

  const handleSelectAll = () => {
    if (selectAll || indeterminate) {
      setSelectedIds([]);
      setSelectAll(false);
      setIndeterminate(false);
    } else {
      const allIds = items.map(item => item.id);
      setSelectedIds(allIds);
      setSelectAll(true);
      setIndeterminate(false);
    }
    onSelectionChange?.(selectAll || indeterminate ? [] : items.map(item => item.id));
  };

  const handleItemSelect = (id: string, checked: boolean) => {
    const newSelected = checked
      ? [...selectedIds, id]
      : selectedIds.filter(selectedId => selectedId !== id);
    setSelectedIds(newSelected);
    onSelectionChange?.(newSelected);

    if (newSelected.length === 0) {
      setSelectAll(false);
      setIndeterminate(false);
    } else if (newSelected.length === items.length) {
      setSelectAll(true);
      setIndeterminate(false);
    } else {
      setSelectAll(false);
      setIndeterminate(true);
    }
  };

  const handleKeepSelected = () => {
    if (selectedIds.length > 0 && onKeepSelected) {
      onKeepSelected();
    }
  };

  const handleDiscardAll = () => {
    if (onDiscardAll) {
      onDiscardAll();
    }
    setSelectedIds([]);
    setSelectAll(false);
    setIndeterminate(false);
    onSelectionChange?.([]);
  };

  const selectedCount = selectedIds.length;
  const hasSelection = selectedCount > 0;
  const allSelected = selectedCount === items.length && items.length > 0;
  const someSelected = selectedCount > 0 && selectedCount < items.length;

  return (
    <div className={className}>
      {items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-ink-muted">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 mb-4 p-3 bg-surface-wash rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-line text-brand-primary focus:ring-2 focus:ring-brand-primary-soft"
                aria-label={allSelected ? 'Desmarcar todos' : 'Marcar todos'}
              />
              <span className="text-sm font-medium">
                {allSelected ? 'Todos selecionados' : someSelected ? `${selectedCount} de ${items.length} selecionados` : 'Marcar todos'}
              </span>
            </label>
            <div className="flex items-center gap-2">
              {hasSelection && (
                <Button variant="primary" size="sm" onClick={handleKeepSelected} icon={<Check className="h-3.5 w-3.5" />}>
                  Manter selecionados
                </Button>
              )}
              {items.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleDiscardAll} icon={<X className="h-3.5 w-3.5" />} className="text-alert border-alert hover:bg-alert-soft">
                  Descartar tudo
                </Button>
              )}
            </div>
          </div>

          <div className="border border-line rounded-xl overflow-hidden">
            {items.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const isExpense = item.amount < 0;
              const displayAmount = formatCurrency(Math.abs(item.amount));
              const amountSign = isExpense ? '-' : '+';

              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-4 p-4 border-b border-line/50 last:border-b-0 transition-colors cursor-pointer ${isSelected ? 'bg-brand-primary-soft' : 'hover:bg-surface-wash'}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                    className="w-4 h-4 rounded border-line text-brand-primary focus:ring-2 focus:ring-brand-primary-soft flex-shrink-0"
                    aria-label={`Selecionar ${item.description}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="num text-ink-muted whitespace-nowrap">{formatDate(item.date)}</span>
                      <span className="font-medium truncate flex-1">{item.description}</span>
                      <span className="uppercase tracking-wider text-xs font-semibold text-ink-muted whitespace-nowrap bg-surface-wash px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <span className={`font-mono font-medium whitespace-nowrap ${isExpense ? 'text-alert' : 'text-positive'}`}>
                    {amountSign}{displayAmount}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ReviewList;