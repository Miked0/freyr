import React from 'react';
import Spinner from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  block?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const VARIANTS = {
  primary: 'bg-accent text-bg border-accent hover:bg-accent/90',
  secondary: 'bg-bg text-ink border-hairline hover:border-ink/30',
  ghost: 'bg-transparent text-muted border-transparent hover:text-ink hover:bg-wash',
  danger: 'bg-transparent text-danger border-transparent hover:bg-danger-soft',
};

const SIZES = {
  sm: 'text-[13px] px-3.5 py-2 gap-1.5',
  md: 'text-sm px-[22px] py-[13px] gap-2',
};

const Button: React.FC<ButtonProps> = ({
  className = '',
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  icon,
  disabled,
  children,
  ...props
}) => (
  <button
    type="button"
    className={`inline-flex items-center justify-center font-medium leading-none rounded-full border transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...props}
  >
    {loading ? <Spinner size="sm" /> : icon && <span className="flex-shrink-0 -my-1">{icon}</span>}
    {children}
  </button>
);

export default Button;
