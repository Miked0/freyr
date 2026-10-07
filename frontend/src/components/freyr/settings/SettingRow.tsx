import type { ReactNode } from 'react';
import { cx } from '../format';

export interface SettingRowProps {
  title: ReactNode;
  /** What the setting changes for the person, not how it works. */
  description?: ReactNode;
  /** Puts the control under the text on wide screens too, for wide lists. */
  stack?: boolean;
  id?: string;
  children?: ReactNode;
}

/** One setting per row: title and a short explanation on the left, the control on the right. */
export function SettingRow({ title, description, stack, id, children }: SettingRowProps) {
  return (
    <div className={cx('fr-srow', stack && 'is-stack')}>
      <div className="fr-srow-text">
        <h3 className="fr-srow-title" id={id}>{title}</h3>
        {description ? <p className="fr-srow-desc">{description}</p> : null}
      </div>
      <div className="fr-srow-control">{children}</div>
    </div>
  );
}
