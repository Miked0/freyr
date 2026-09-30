import React, { useCallback, useRef, useState } from 'react';

export interface DropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string[];
  maxSize?: number;
  disabled?: boolean;
}

const DEFAULT_ACCEPT = ['.pdf', '.csv'];
const DEFAULT_MAX_SIZE = 4 * 1024 * 1024; // 4MB

type DropzoneState = 'idle' | 'drag-active' | 'error';

const Dropzone: React.FC<DropzoneProps> = ({
  onFileSelect,
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE,
  disabled = false,
}) => {
  const [state, setState] = useState<DropzoneState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const validateFile = useCallback((file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!accept.some(a => a.toLowerCase() === ext)) {
      return 'Formato não suportado. Envie um arquivo PDF ou CSV.';
    }
    if (file.size > maxSize) {
      return 'Arquivo muito grande. O tamanho máximo é 4 MB.';
    }
    return null;
  }, [accept, maxSize]);

  const handleFileSelect = useCallback((file: File | undefined) => {
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setState('error');
      return;
    }

    setErrorMessage(null);
    setState('idle');
    onFileSelect(file);
  }, [onFileSelect, validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (!disabled) setState('drag-active');
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setState('idle');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setState('error');
      return;
    }

    handleFileSelect(file);
    setState('idle');
  }, [disabled, handleFileSelect, validateFile]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFileSelect(file);
    if (e.target) e.target.value = '';
  }, [handleFileSelect]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    setState('idle');
  }, []);

  const acceptAttr = accept.join(',');

  const isDragActive = state === 'drag-active';
  const isError = state === 'error';

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptAttr}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || isDragActive}
        data-testid="dropzone-input"
        aria-label="Selecionar arquivo"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={disabled ? 'Área de upload desabilitada' : 'Arraste o arquivo para cá ou clique para selecionar'}
        aria-describedby={isError ? 'dropzone-error' : 'dropzone-hint'}
        className={`
          flex flex-col items-center justify-center gap-4
          border-2 border-dashed rounded-[8px]
          p-8 md:p-12 text-center
          transition-colors duration-150 ease-out
          cursor-pointer select-none
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isDragActive
            ? 'border-brand-primary bg-brand-primary-soft'
            : isError
            ? 'border-alert bg-alert-soft'
            : 'border-line'
          }
        `}
        data-testid="dropzone-area"
        data-state={state}
      >
        <svg
          className="h-7 w-7 flex-shrink-0"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{ color: isError ? 'var(--color-alert)' : 'var(--color-brand-primary)' }}
        >
          <path
            d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 10l-5 5-5-5M12 15V3"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div>
          <p
            className="text-xl font-medium tracking-[-0.03em] leading-tight"
            data-testid="dropzone-text"
          >
            {isDragActive ? 'Solte o arquivo aqui' : 'Arraste o PDF ou CSV para cá'}
          </p>
          <p id="dropzone-hint" className="text-sm text-muted mt-1">
            Extrato bancário ou fatura de cartão · até 4 MB · no CSV, colunas de data, valor e descrição
          </p>
        </div>

        {isError && (
          <p
            id="dropzone-error"
            role="alert"
            className="text-sm text-alert mt-2 animate-fade-in"
            data-testid="dropzone-error"
          >
            {errorMessage}
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearError();
              }}
              className="ml-2 underline hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-alert focus-visible:ring-offset-2"
            >
              Tentar novamente
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Dropzone;