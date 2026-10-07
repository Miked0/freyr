import { Icon } from '../Icon';

export interface ToastProps {
  message: string | null;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
}

/** A short note at the foot of the screen about what just happened, with an optional way back. */
export function Toast({ message, actionLabel, onAction, onClose }: ToastProps) {
  if (!message) return null;
  return (
    <div className="fr-toast" role="status" aria-live="polite">
      <span>{message}</span>
      {actionLabel && onAction ? <button type="button" className="fr-toast-action" onClick={onAction}>{actionLabel}</button> : null}
      {onClose ? <button type="button" className="fr-icon-btn" aria-label="Fechar aviso" onClick={onClose}><Icon name="close" size={14} /></button> : null}
    </div>
  );
}
