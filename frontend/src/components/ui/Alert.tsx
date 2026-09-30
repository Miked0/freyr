import React from 'react';
import { X } from 'lucide-react';

export type AlertVariant = 'error' | 'success' | 'warning' | 'info';

export interface AlertProps {
  variant: AlertVariant;
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const VARIANT_STYLES: Record<AlertVariant, { bg: string; border: string; text: string; iconColor: string }> = {
  error: { bg: 'bg-danger-soft', border: 'border-danger', text: 'text-danger', iconColor: 'text-danger' },
  success: { bg: 'bg-success-soft', border: 'border-success', text: 'text-success', iconColor: 'text-success' },
  warning: { bg: 'bg-warm-soft', border: 'border-warm', text: 'text-warm', iconColor: 'text-warm' },
  info: { bg: 'bg-accent-soft', border: 'border-accent', text: 'text-accent', iconColor: 'text-accent' },
};

const VARIANT_ICONS: Record<AlertVariant, React.ReactNode> = {
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 flex-shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 flex-shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 flex-shrink-0" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 flex-shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

const VARIANT_ROLES: Record<AlertVariant, 'alert' | 'status'> = {
  error: 'alert',
  success: 'status',
  warning: 'alert',
  info: 'status',
};

const Alert: React.FC<AlertProps> = ({
  variant,
  title,
  message,
  dismissible = false,
  onDismiss,
  className = '',
}) => {
  const styles = VARIANT_STYLES[variant];
  const role = VARIANT_ROLES[variant];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${styles.bg} ${styles.border} ${styles.text} ${className}`}
      role={role}
      aria-live={variant === 'error' || variant === 'warning' ? 'assertive' : 'polite'}
    >
      <span className={styles.iconColor} aria-hidden="true">
        {VARIANT_ICONS[variant]}
      </span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium">{title}</p>}
        <p className={title ? 'mt-1' : ''}>{message}</p>
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
          aria-label="Dispensar"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default Alert;