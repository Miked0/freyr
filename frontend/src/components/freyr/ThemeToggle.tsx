import { useTheme } from '@/lib/useTheme';
import { Icon } from './Icon';

const css = `
.fr-theme-toggle { display: grid; place-items: center; flex: none; width: 36px; height: 36px; padding: 0; border: var(--border-width) solid var(--line); border-radius: var(--radius-sm); background: transparent; color: var(--ink-muted); cursor: pointer; }
.fr-theme-toggle:hover { color: var(--ink); background: var(--skeleton); }
.fr-theme-toggle:focus-visible { outline: 2px solid transparent; box-shadow: var(--focus-ring); }
`;

/** Switches between the light and dark themes. Shows the theme it switches to. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <>
      <style href="freyr-theme-toggle" precedence="default">{css}</style>
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="Tema escuro"
        title={dark ? 'Usar tema claro' : 'Usar tema escuro'}
        className="fr-theme-toggle"
        onClick={toggle}
      >
        <Icon name={dark ? 'sun' : 'moon'} size={18} />
      </button>
    </>
  );
}
