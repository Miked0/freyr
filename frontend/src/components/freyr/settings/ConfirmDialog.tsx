import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../format';
import { Button } from '../Button';
import { Icon } from '../Icon';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  tone?: 'danger';
  /** When set, the confirm button only unlocks once this word is typed (any case). */
  confirmWord?: string;
  /** Says exactly what happens, with the number: "Apagar 142 transações". */
  confirmLabel: string;
  cancelLabel?: string;
  disabled?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}

/** Confirmation over a scrim. Esc, the X and a click outside close it; focus goes to its first control. */
export function ConfirmDialog({ open, title, tone, confirmWord, confirmLabel, cancelLabel = 'Cancelar', disabled, busy, onConfirm, onClose, children }: ConfirmDialogProps) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!open) {
      setTyped('');
      return;
    }
    const opener = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>('input, select, button:not([aria-label="Fechar"])')?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
    // Focus moves once per opening, not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  const ok = (!confirmWord || typed.trim().toUpperCase() === confirmWord.toUpperCase()) && !disabled && !busy;

  return createPortal(
    <div className="fr-confirm" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={box} className={cx('fr-dialog', tone === 'danger' && 'is-danger')} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
        <header className="fr-dialog-head">
          <h2 className="fr-dialog-title" id={`${id}-title`}>{title}</h2>
          <button type="button" className="fr-icon-btn" aria-label="Fechar" onClick={onClose}><Icon name="close" size={16} /></button>
        </header>
        <div className="fr-dialog-body">
          {children}
          {confirmWord ? (
            <div className="fr-field">
              <label className="fr-field-label" htmlFor={`${id}-word`}>Digite {confirmWord} para confirmar</label>
              <input id={`${id}-word`} className="fr-input" value={typed} autoComplete="off" spellCheck={false} onChange={event => setTyped(event.target.value)} />
            </div>
          ) : null}
        </div>
        <footer className="fr-dialog-foot">
          <Button variant="outline" onClick={onClose}>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} disabled={!ok} onClick={() => { if (ok) onConfirm(); }}>{confirmLabel}</Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
