import type { ButtonHTMLAttributes } from 'react';
import { cx } from './format';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
}

export function Button({ variant = 'primary', className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} {...rest} className={cx('fr-btn', 'fr-btn-' + variant, className)} />;
}
