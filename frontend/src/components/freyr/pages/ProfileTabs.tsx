import { routeHref, type Route } from '@/lib/useRoute';

const css = `
.fr-tabs { display: flex; gap: var(--space-6); border-bottom: var(--border-width) solid var(--line); overflow-x: auto; }
.fr-tab { position: relative; display: inline-flex; align-items: center; min-height: 44px; font-size: 15px; line-height: 20px; font-weight: 700; color: var(--ink-muted); text-decoration: none; white-space: nowrap; border-radius: var(--radius-xs); transition: color 160ms ease-out; }
.fr-tab::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: transparent; transition: background-color 160ms ease-out; }
.fr-tab:hover { color: var(--ink); }
.fr-tab[aria-current="page"] { color: var(--ink); }
.fr-tab[aria-current="page"]::after { background: var(--brand-primary); }
.fr-tab:focus-visible { outline: 2px solid transparent; box-shadow: var(--focus-ring); }
`;

const TABS: { route: Route; label: string }[] = [
  { route: 'profile', label: 'Perfil' },
  { route: 'settings', label: 'Configurações' },
];

/** Switches between the profile and its settings; both live under "Perfil". */
export function ProfileTabs({ current }: { current: Route }) {
  return (
    <nav className="fr-tabs" aria-label="Perfil">
      <style href="freyr-tabs" precedence="default">{css}</style>
      {TABS.map(tab => (
        <a key={tab.route} className="fr-tab" href={routeHref(tab.route)} aria-current={tab.route === current ? 'page' : undefined}>
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
