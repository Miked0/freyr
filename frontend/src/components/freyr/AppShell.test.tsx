import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('lays out the nav beside the main content', () => {
    const { container } = render(
      <AppShell nav={<nav aria-label="Principal">nav</nav>}>
        <p>conteúdo</p>
      </AppShell>,
    );
    const app = container.querySelector('.fr-app')!;
    const main = screen.getByRole('main');
    expect(app).toContainElement(screen.getByRole('navigation'));
    expect(main).toHaveClass('fr-main');
    expect(main).toHaveTextContent('conteúdo');
    expect(app.lastElementChild).toBe(main);
  });

  it('ships the grid and the mobile top-bar rules', () => {
    render(<AppShell nav={<nav />}>x</AppShell>);
    const css = Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n');
    expect(css).toMatch(/\.fr-app\s*\{[^}]*grid-template-columns:\s*248px/);
    expect(css).toMatch(/@media \(max-width: 860px\)/);
  });

  it('keeps the page links in a scrollable row on the mobile top bar', () => {
    render(<AppShell nav={<nav />}>x</AppShell>);
    const css = Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n');
    const mobile = css.slice(css.indexOf('@media (max-width: 860px)'));
    expect(mobile).not.toMatch(/display:\s*none/);
    expect(mobile).toMatch(/\.fr-side-sec\s*\{[^}]*overflow-x:\s*auto/);
    expect(mobile).toMatch(/\.fr-side ul\s*\{[^}]*grid-auto-flow:\s*column/);
    expect(mobile).toMatch(/\.fr-side-title\s*\{[^}]*position:\s*absolute/);
  });
});
