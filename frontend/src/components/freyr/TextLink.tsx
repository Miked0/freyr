import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEventHandler, ReactNode } from 'react';
import { cx } from './format';

export interface TextLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'onClick'> {
  href?: string;
  children?: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
}

/** Underlined text action: an anchor with `href`, otherwise a plain button. */
export function TextLink({ className, href, ...rest }: TextLinkProps) {
  if (href) return <a {...rest} href={href} className={cx('fr-link', className)} />;
  return <button type="button" {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} className={cx('fr-link', className)} />;
}
