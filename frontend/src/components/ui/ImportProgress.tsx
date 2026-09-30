import React from 'react';

export interface ImportProgressProps {
  phase: 'uploading' | 'processing' | 'review' | 'saving';
  fileName: string;
  itemCount: number;
  totalAmount: number;
  onDiscardAll: () => void;
  onKeep: (selectedIds: string[]) => void;
}

interface ReviewItem {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
}

const PHASE_LABELS: Record<ImportProgressProps['phase'], string> = {
  uploading: 'Enviando arquivo',
  processing: 'Processando extrato',
  review: 'Revisar despesas',
  saving: 'Salvando alterações',
};

const PHASE_DESCRIPTIONS: Record<ImportProgressProps['phase'], string> = {
  uploading: 'Aguarde enquanto enviamos o arquivo para processamento.',
  processing: 'Lendo o extrato e categorizando cada despesa — com a IA ativa, cerca de 1 segundo por item.',
  review: 'Confira as despesas encontradas. Desmarque as que não deseja manter.',
  saving: 'Aplicando suas alterações...',
};

const SKELETON_ITEMS = 5;

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
};

const formatDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const categoryColors: Record<string, string> = {
  alimentacao: '#3E7A5E',
  transporte: '#5B5A96',
  moradia: '#C97B3D',
  saude: '#B5533C',
  educacao: '#2A7F8E',
  lazer: '#8B5E3C',
  outros: '#6B6B6B',
};

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`animate-pulse bg-surface-wash rounded ${className}`}
    aria-hidden="true"
    data-testid="skeleton"
  />
);

const SkeletonRow: React.FC = () => (
  <li className="py-3.5 px-1">
    <div className="flex items-center gap-4">
      <Skeleton className="w-4 h-4 rounded" />
      <Skeleton className="text-muted num text-sm w-[84px] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="block h-4 w-3/4" />
        <Skeleton className="inline-flex items-center gap-2 text-sm mt-1 h-4 w-1/2" />
      </div>
      <Skeleton className="font-medium num whitespace-nowrap h-4 w-24" />
    </div>
  </li>
);

const ReviewItem: React.FC<{
  item: ReviewItem;
  isSelected: boolean;
  onToggle: () => void;
  disabled: boolean;
}> = ({ item, isSelected, onToggle, disabled }) => (
  <li>
    <label
      className={`flex items-center gap-4 py-3.5 px-1 cursor-pointer transition-opacity hover:bg-wash ${
        isSelected ? '' : 'opacity-40'
      }`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        disabled={disabled}
        className="w-4 h-4 accent-accent flex-shrink-0"
        aria-label={`Selecionar ${item.description}`}
      />
      <span className="text-muted num text-sm w-[84px] flex-shrink-0">{formatDate(item.date)}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-medium truncate">{item.description}</span>
        <span className="inline-flex items-center gap-2 text-sm text-muted">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: categoryColors[item.category] || categoryColors.outros }}
            aria-hidden="true"
          />
          {item.category}
        </span>
      </span>
      <span className="font-medium num whitespace-nowrap">{formatCurrency(item.amount)}</span>
    </label>
  </li>
);

const ImportProgress: React.FC<ImportProgressProps> = ({
  phase,
  fileName,
  itemCount,
  totalAmount,
  onDiscardAll,
  onKeep,
}) => {
  const isBusy = phase === 'uploading' || phase === 'processing' || phase === 'saving';
  const isReview = phase === 'review';

  return (
    <div role="status" aria-live="polite" aria-busy={isBusy} className="animate-fade-in">
      {/* Phase indicator */}
      <div className="dropzone flex items-center gap-4 !text-left" data-testid="import-progress-phase">
        {isBusy && (
          <>
            <Skeleton className="h-7 w-7 rounded-full bg-brand-primary-soft flex-shrink-0" />
            <div>
              <div className="text-xl font-medium flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <span>{fileName}</span>
              </div>
              <div className="text-muted">
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
            </div>
          </>
        )}

        {!isBusy && (
          <>
            <svg
              className="h-7 w-7 text-accent flex-shrink-0"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M14 2v8h8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 13H8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 17H8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 9H8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <p className="text-xl font-medium flex items-center gap-2">
                <span className="h-5 w-5" aria-hidden="true" /> {fileName}
              </p>
              <p className="text-muted">
                {itemCount} {itemCount === 1 ? 'despesa encontrada' : 'despesas encontradas'} somando{' '}
                <span className="marker num">{formatCurrency(totalAmount)}</span>
                . {isReview ? 'Já estão salvas — desmarque as que não quer manter.' : ''}
              </p>
            </div>
          </>
        )}
      </div>

      {isReview && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
            <div className="min-w-0" />
            <button
              type="button"
              className="text-sm text-accent hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded"
              onClick={onDiscardAll}
              disabled={isBusy}
              data-testid="discard-all-btn"
            >
              Descartar tudo
            </button>
          </div>

          <ul
            className="divide-y divide-hairline border-y border-hairline max-h-[28rem] overflow-y-auto"
            role="list"
            aria-label="Lista de despesas para revisão"
            data-testid="review-list"
          >
            {isBusy ? (
              Array.from({ length: SKELETON_ITEMS }, (_, i) => (
                <SkeletonRow key={i} />
              ))
            ) : (
              []
            )}
          </ul>

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              className="text-alert hover:underline focus-visible:ring-2 focus-visible:ring-alert focus-visible:ring-offset-2 rounded sm:mr-auto"
              onClick={onDiscardAll}
              disabled={isBusy}
              data-testid="discard-all-btn-bottom"
            >
              Descartar tudo
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-bg font-medium rounded-[4px] hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
              onClick={() => onKeep([])}
              disabled={isBusy}
              data-testid="keep-btn"
            >
              {isBusy ? (
                <Skeleton className="h-4 w-4 rounded-full" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
              Manter seleção
            </button>
          </div>
        </>
      )}

      {/* Phase status text for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {PHASE_LABELS[phase]}: {PHASE_DESCRIPTIONS[phase]}
      </div>
    </div>
  );
};

export default ImportProgress;