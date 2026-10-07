import { cx } from '../format';
import { Icon, type IconName } from '../Icon';

export interface SettingsNavItem {
  id: string;
  label: string;
  icon: IconName;
  tone?: 'alert';
}

export interface SettingsNavProps {
  items: SettingsNavItem[];
  active: string;
  onSelect: (id: string) => void;
}

/** Index of the settings sections: a sticky list beside them on wide screens, scrollable tabs on a phone. */
export function SettingsNav({ items, active, onSelect }: SettingsNavProps) {
  return (
    <nav className="fr-snav" aria-label="Seções das configurações">
      <ul>
        {items.map(item => {
          const on = item.id === active;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cx('fr-snav-item', on && 'is-active', item.tone === 'alert' && 'is-alert')}
                aria-current={on ? 'true' : undefined}
                onClick={event => { event.preventDefault(); onSelect(item.id); }}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
