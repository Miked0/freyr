import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import { createPortal } from 'react-dom';

export interface DestructiveActionProps {
  label: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: 'delete' | 'discard';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  modalTitle?: string;
  modalMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

const VARIANT_STYLES = {
  delete: {
    button: 'bg-transparent text-alert border-alert hover:bg-alert-soft',
    modalButton: 'bg-alert text-surface hover:bg-alert/90',
  },
  discard: {
    button: 'bg-transparent text-brand-warm border-brand-warm hover:bg-brand-warm-soft',
    modalButton: 'bg-brand-warm text-surface hover:bg-brand-warm/90',
  },
};

const VARIANT_DEFAULTS = {
  delete: {
    modalTitle: 'Excluir item?',
    modalMessage: 'Esta ação não pode ser desfeita.',
    confirmLabel: 'Excluir',
    cancelLabel: 'Cancelar',
  },
  discard: {
    modalTitle: 'Descartar tudo?',
    modalMessage: 'Todos os itens serão removidos permanentemente.',
    confirmLabel: 'Descartar',
    cancelLabel: 'Cancelar',
  },
};

const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmVariant: 'delete' | 'discard';
  loading: boolean;
  disabled: boolean;
}> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmVariant,
  loading,
  disabled,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      contentRef.current?.focus();
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'Tab') {
          const focusableElements = contentRef.current?.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements?.length) {
            const first = focusableElements[0];
            const last = focusableElements[focusableElements.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const confirmStyles = VARIANT_STYLES[confirmVariant].modalButton;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-message"
    >
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-text/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        tabIndex={-1}
        className="relative bg-surface rounded-2xl p-6 w-full max-w-md shadow-xl animate-fade-in border border-line"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded hover:bg-surface-wash transition-colors"
          aria-label="Fechar"
        >
          <X className="h-5 w-5 text-ink-muted" />
        </button>
        
        <h2 id="modal-title" className="text-lg font-medium mb-2">
          {title}
        </h2>
        <p id="modal-message" className="text-ink-muted mb-6">
          {message}
        </p>
        
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading || disabled}
          >
            {cancelLabel}
          </Button>
          <Button
            className={confirmStyles}
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
            loading={loading}
            disabled={disabled}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const DestructiveAction: React.FC<DestructiveActionProps> = ({
  label,
  onConfirm,
  onCancel,
  variant = 'delete',
  disabled = false,
  loading = false,
  className = '',
  modalTitle,
  modalMessage,
  confirmLabel,
  cancelLabel,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const defaults = VARIANT_DEFAULTS[variant];
  const buttonStyles = VARIANT_STYLES[variant].button;

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    await onConfirm();
    onCancel?.();
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    onCancel?.();
  };

  return (
    <>
      <Button
        variant="outline"
        className={`${buttonStyles} ${className}`}
        onClick={handleOpenModal}
        disabled={disabled || loading}
        loading={loading}
        aria-haspopup="dialog"
      >
        {label}
      </Button>
      
      <Modal
        isOpen={isModalOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={modalTitle || defaults.modalTitle}
        message={modalMessage || defaults.modalMessage}
        confirmLabel={confirmLabel || defaults.confirmLabel}
        cancelLabel={cancelLabel || defaults.cancelLabel}
        confirmVariant={variant}
        loading={loading}
        disabled={disabled}
      />
    </>
  );
};

export default DestructiveAction;