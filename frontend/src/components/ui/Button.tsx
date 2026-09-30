import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  block?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const VARIANTS = {
  primary: 'bg-brand-primary text-surface border-brand-primary hover:bg-brand-primary/90 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  secondary: 'bg-surface text-text border-line hover:border-text/30 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  outline: 'bg-transparent text-brand-primary border-brand-primary hover:bg-brand-primary-soft focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  ghost: 'bg-transparent text-text hover:bg-surface-wash focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  danger: 'bg-alert text-surface border-alert hover:bg-alert/90 focus-visible:ring-2 focus-visible:ring-alert focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
};

const SIZES = {
  sm: 'text-[13px] px-3 py-2 gap-1.5',
  md: 'text-sm px-[22px] py-[13px] gap-2',
};

const Button: React.FC<ButtonProps> = ({
  className = '',
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  disabled,
  children,
  icon,
  ...props
}) => (
  <button
    type="button"
    className={`
      inline-flex items-center justify-center font-medium leading-none rounded-[4px]
      border transition-all duration-160 ease-out
      disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer
      ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}
    `}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...props}
  >
    {loading ? (
      <svg
        className="animate-spin h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ) : icon ? (
      <span className="flex-shrink-0">{icon}</span>
    ) : null}
    {children}
  </button>
);

export default Button;