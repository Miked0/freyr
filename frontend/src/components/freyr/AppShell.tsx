import type { ReactNode } from 'react';

// Page-level layout from the Dashboard preview; kept here so freyr.css stays a 1:1 port of the bundle.
const css = `
.fr-app { display: grid; grid-template-columns: 248px minmax(0, 1fr); min-height: 100vh; background: var(--background); color: var(--ink); }
.fr-app > .fr-side { position: sticky; top: 0; align-self: start; height: 100vh; box-sizing: border-box; overflow-y: auto; }
.fr-main { padding: var(--space-6) var(--space-8) var(--space-12); display: grid; gap: var(--space-6); align-content: start; min-width: 0; }
@media (max-width: 860px) {
  .fr-app { grid-template-columns: 1fr; }
  .fr-app > .fr-side { position: static; height: auto; flex-direction: row; align-items: center; justify-content: space-between; padding: var(--space-4); border-right: 0; border-bottom: var(--border-width) solid var(--line); }
  .fr-app > .fr-side > :not(.fr-side-brand):not(.fr-side-foot) { display: none; }
  .fr-app > .fr-side > .fr-side-foot { margin: 0; display: flex; align-items: center; gap: var(--space-4); padding: 0; }
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
