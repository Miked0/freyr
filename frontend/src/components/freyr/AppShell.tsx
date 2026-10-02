import type { ReactNode } from 'react';

// Page-level layout from the Dashboard preview; kept here so freyr.css stays a 1:1 port of the bundle.
const css = `
.fr-app { display: grid; grid-template-columns: 248px minmax(0, 1fr); min-height: 100vh; background: var(--background); color: var(--ink); }
.fr-app > .fr-side { position: sticky; top: 0; align-self: start; height: 100vh; box-sizing: border-box; overflow-y: auto; }
.fr-main { padding: var(--space-6) var(--space-8) var(--space-12); display: grid; gap: var(--space-6); align-content: start; min-width: 0; }
@media (max-width: 860px) {
  .fr-app { grid-template-columns: 1fr; }
  .fr-app > .fr-side { position: static; height: auto; flex-direction: row; flex-wrap: wrap; align-items: center; gap: var(--space-3) var(--space-4); padding: var(--space-4); border-right: 0; border-bottom: var(--border-width) solid var(--line); overflow: visible; }
  .fr-app > .fr-side > .fr-side-foot { order: 2; margin: 0 0 0 auto; padding: 0; }
  .fr-app > .fr-side > .fr-side-sec { order: 3; flex: 1 1 100%; min-width: 0; overflow-x: auto; }
  .fr-app > .fr-side .fr-side-title { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .fr-app > .fr-side ul { grid-auto-flow: column; grid-auto-columns: max-content; gap: var(--space-1); }
  .fr-app > .fr-side .fr-side-item { white-space: nowrap; }
  .fr-app > .fr-side .fr-side-item.is-active { box-shadow: inset 0 -2px 0 var(--brand-primary); }
  .fr-main { padding: var(--space-6) var(--space-4) var(--space-12); }
}
`;

export interface AppShellProps {
  nav: ReactNode;
  children: ReactNode;
}

export function AppShell({ nav, children }: AppShellProps) {
  return (
    <div className="fr-app">
      <style href="freyr-app-shell" precedence="default">{css}</style>
      {nav}
      <main className="fr-main">{children}</main>
    </div>
  );
}
