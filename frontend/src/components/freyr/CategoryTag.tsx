import type { ReactNode } from 'react';
import { cx } from './format';

export interface CategoryTagProps {
  tone?: 'positive' | 'alert' | 'brand' | 'muted' | null;
  children?: ReactNode;
}

export function CategoryTag({ tone, children }: CategoryTagProps) {
  return <span className={cx('fr-tag', tone && 'fr-tag-' + tone)}>[ {children} ]</span>;
}
