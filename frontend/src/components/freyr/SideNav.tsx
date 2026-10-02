import type { ReactNode } from 'react';
import { cx } from './format';
import { Icon, type IconName } from './Icon';
import { Wordmark } from './Wordmark';

export interface SideNavItem {
  icon: IconName;
  label: string;
  href?: string;
  count?: number;
  active?: boolean;
}

export interface SideNavProps {
  sections: Array<{ title: string; items: SideNavItem[] }>;
  search?: boolean;
  footer?: ReactNode;
}

export function SideNav({ sections, search = false, footer }: SideNavProps) {
  return (
    <nav className="fr-side" aria-label="Principal">
      <div className="fr-side-brand"><Wordmark size={20} /></div>
      {search ? (
        <label className="fr-side-search">
          <Icon name="search" size={16} />
          <input type="search" placeholder="Buscar" aria-label="Buscar" />
          <kbd>⌘K</kbd>
        </label>
      ) : null}
      {sections.map(sec => (
        <div key={sec.title} className="fr-side-sec">
          <p className="fr-side-title">{sec.title}</p>
          <ul>
            {sec.items.map(it => (
              <li key={it.label}>
                <a
                  href={it.href || '#'}
                  className={cx('fr-side-item', it.active && 'is-active')}
                  aria-current={it.active ? 'page' : undefined}
                >
                  <Icon name={it.icon} size={18} />
                  <span>{it.label}</span>
                  {it.count != null ? <span className="fr-side-count">{it.count}</span> : null}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {footer || null}
    </nav>
  );
}
