import { useId } from 'react';
import { useTheme } from '@/lib/useTheme';
import { Icon } from './Icon';

// The orb is the sun (brand-warm, "Colheita") on the light side; switching slides it across the track while the rays
// fold away and a bite turns it into the moon (brand-primary, "Aurora"). Everything keys off aria-checked.
const css = `
.fr-theme-toggle { position: relative; display: block; flex: none; width: 64px; height: 34px; padding: 0; border: var(--border-width) solid var(--line-strong); border-radius: var(--radius-md); background: var(--surface); color: var(--ink-muted); cursor: pointer; transition: background-color 320ms ease-out, border-color 320ms ease-out; }
.fr-theme-toggle:hover { border-color: var(--ink); }
.fr-theme-toggle:focus-visible { outline: 2px solid transparent; box-shadow: var(--focus-ring); }
.fr-theme-mark { position: absolute; top: 50%; margin-top: -7px; opacity: .5; transition: opacity 320ms ease-out; }
.fr-theme-mark.is-sun { left: 8px; }
.fr-theme-mark.is-moon { right: 8px; }
.fr-theme-thumb { position: absolute; top: 3px; left: 3px; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: var(--background); box-shadow: 0 0 0 1px var(--line); color: var(--brand-warm); transition: transform 420ms cubic-bezier(.65, 0, .35, 1), color 420ms ease-out, box-shadow 420ms ease-out; }
.fr-theme-orb { overflow: visible; }
.fr-theme-core { fill: currentColor; transform-origin: 12px 12px; transition: transform 420ms cubic-bezier(.65, 0, .35, 1); }
.fr-theme-rays { stroke: currentColor; stroke-width: 2; stroke-linecap: square; transform-origin: 12px 12px; transition: transform 420ms cubic-bezier(.65, 0, .35, 1), opacity 260ms ease-out; }
.fr-theme-bite { transition: transform 420ms cubic-bezier(.65, 0, .35, 1); }
.fr-theme-toggle[aria-checked="true"] .fr-theme-thumb { transform: translateX(30px) rotate(-30deg); color: var(--brand-primary); box-shadow: 0 0 0 1px var(--line), var(--glow-aurora); }
.fr-theme-toggle[aria-checked="true"] .fr-theme-core { transform: scale(1.55); }
.fr-theme-toggle[aria-checked="true"] .fr-theme-rays { transform: rotate(90deg) scale(.4); opacity: 0; }
.fr-theme-toggle[aria-checked="true"] .fr-theme-bite { transform: translate(-8px, 5px); }
.fr-theme-toggle[aria-checked="false"] .fr-theme-mark.is-sun, .fr-theme-toggle[aria-checked="true"] .fr-theme-mark.is-moon { opacity: 0; }
`;

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
  const r = (deg * Math.PI) / 180;
  const at = (d: number) => [12 + Math.cos(r) * d, 12 + Math.sin(r) * d].map(n => n.toFixed(2));
  const [x1, y1] = at(8);
  const [x2, y2] = at(10.5);
  return { x1, y1, x2, y2 };
});

/** Switches between the light and dark themes; the thumb itself turns from sun into moon. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  const maskId = `fr-theme-crescent-${useId().replace(/:/g, '')}`;
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
        <Icon name="sun" size={14} className="fr-theme-mark is-sun" />
        <Icon name="moon" size={14} className="fr-theme-mark is-moon" />
        <span className="fr-theme-thumb">
          <svg className="fr-theme-orb" viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false">
            <mask id={maskId}>
              <rect width="24" height="24" fill="white" />
              <circle className="fr-theme-bite" cx="25" cy="3" r="6" fill="black" />
            </mask>
            <circle className="fr-theme-core" cx="12" cy="12" r="5" mask={`url(#${maskId})`} />
            <g className="fr-theme-rays">
              {RAYS.map(l => <line key={`${l.x1}${l.y1}`} {...l} />)}
            </g>
          </svg>
        </span>
      </button>
    </>
  );
}
