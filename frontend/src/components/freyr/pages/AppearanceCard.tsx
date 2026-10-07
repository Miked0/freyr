import { useId } from 'react';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/theme';
import { BentoCard } from '../BentoCard';

const css = `
.fr-card-fit { align-self: start; }
.fr-themes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.fr-theme-opt { display: grid; gap: var(--space-2); cursor: pointer; font-size: 14px; line-height: 20px; font-weight: 700; color: var(--ink-muted); }
.fr-theme-opt input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.fr-theme-sample { display: grid; gap: 6px; padding: var(--space-3); height: 72px; border-radius: var(--radius-sm); border: var(--border-width) solid var(--line-strong); align-content: start; transition: box-shadow 160ms ease-out; }
.fr-theme-sample i { display: block; height: 8px; border-radius: 2px; }
.fr-theme-sample.is-light { background: #F7F6F3; } .fr-theme-sample.is-light i { background: #D9D5CE; } .fr-theme-sample.is-light i:first-child { background: #5B5794; width: 40%; }
.fr-theme-sample.is-dark { background: #0E1519; } .fr-theme-sample.is-dark i { background: #2A3740; } .fr-theme-sample.is-dark i:first-child { background: #9C98E0; width: 40%; }
.fr-theme-opt input:checked + .fr-theme-sample { box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ink); }
.fr-theme-opt input:checked ~ span { color: var(--ink); }
.fr-theme-opt input:focus-visible + .fr-theme-sample { box-shadow: var(--focus-ring); }
`;

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Fiorde (escuro)' },
];

/** Picks the theme; the same choice the sun/moon switch in the side menu makes. */
export function AppearanceCard() {
  const { theme, set } = useTheme();
  const id = useId();
  return (
    <BentoCard span={4} title="Aparência" className="fr-card-fit">
      <style href="freyr-appearance" precedence="default">{css}</style>
      <div role="radiogroup" aria-label="Tema" className="fr-themes">
        {THEMES.map(option => (
          <label key={option.value} className="fr-theme-opt">
            <input type="radio" name={`${id}-theme`} value={option.value} checked={theme === option.value} onChange={() => set(option.value)} />
            <span className={`fr-theme-sample is-${option.value}`} aria-hidden="true"><i /><i /><i /></span>
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </BentoCard>
  );
}
