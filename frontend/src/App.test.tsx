import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

// The backend is the system boundary: answer each API route as a logged-in user with no expenses.
function stubApi(routes: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const path = Object.keys(routes).find(p => url.endsWith(p));
    return new Response(JSON.stringify(path ? routes[path] : {}), { status: path ? 200 : 404 });
  }));
}

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.location.hash = '';
  });

  const loggedIn = {
    '/api/auth/session': { authenticated: true, user: { id: 'u1', username: 'ana' } },
    '/api/health': { status: 'OK', ai: 'keywords' },
    '/api/expenses': [],
    '/api/expenses/categories/all': [],
  };

  it('shows the dashboard to a user whose session is already open', async () => {
    stubApi(loggedIn);

    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Visão geral financeira' }, { timeout: 3000 })).toBeInTheDocument();
  });

  it('switches pages from the side nav', async () => {
    stubApi(loggedIn);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    render(<App />);
    fireEvent.click(await screen.findByRole('link', { name: /^Transações/ }, { timeout: 3000 }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Todas as transações' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Visão geral financeira' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Transações/ })).toHaveAttribute('aria-current', 'page');
  });

  it('tells the user the server is unreachable and offers to retry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));

    render(<App />);

    expect(await screen.findByText(/não foi possível falar com o servidor/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument();
  });
});
