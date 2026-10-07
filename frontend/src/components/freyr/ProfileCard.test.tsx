import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '@/api';
import { resetProfile } from '@/lib/useProfile';
import { ProfileCard } from './ProfileCard';

const PROFILE: Profile = { username: 'ana', display_name: 'Ana Souza', avatar_color: 'frost', monthly_budget: null, invested_balance: null, invested_balance_on: null };

function stubProfile(response: () => Response) {
  const fetchMock = vi.fn(async () => response());
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const ok = (profile: Profile) => () => new Response(JSON.stringify(profile), { status: 200 });

describe('ProfileCard', () => {
  beforeEach(() => resetProfile());
  afterEach(() => vi.unstubAllGlobals());

  it('links the whole card to the profile page with the name, handle and initials', async () => {
    stubProfile(ok(PROFILE));
    render(<ProfileCard />);

    const link = await screen.findByRole('link', { name: /Ana Souza/ });
    expect(link).toHaveAttribute('href', '#/configuracoes');
    expect(link).toHaveAccessibleName(/editar perfil/i);
    expect(screen.getByText('@ana')).toBeInTheDocument();

    const avatar = screen.getByText('AS');
    expect(avatar).toHaveClass('fr-avatar');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
    expect(avatar).toHaveStyle({ background: 'var(--frost)' });
  });

  it('shows the username as the name when there is no display name', async () => {
    stubProfile(ok({ ...PROFILE, display_name: null, avatar_color: 'brand-primary' }));
    render(<ProfileCard />);

    expect(await screen.findByRole('link', { name: /^ana/ })).toBeInTheDocument();
    expect(screen.getByText('AN')).toHaveStyle({ background: 'var(--brand-primary)' });
  });

  it('offers "Sair" only when it can log out, and forgets the profile on the way out', async () => {
    const fetchMock = stubProfile(ok(PROFILE));
    const onLogout = vi.fn();
    const { rerender } = render(<ProfileCard />);
    await screen.findByText('Ana Souza');
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument();

    rerender(<ProfileCard onLogout={onLogout} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(onLogout).toHaveBeenCalledTimes(1);
    // Once logged out the store is reset, so the card asks the server again for whoever is logged in next.
    const callsBefore = fetchMock.mock.calls.length;
    await vi.waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('shows no profile link without a logged-in account, keeping "Sair" if offered', async () => {
    const fetchMock = stubProfile(() => new Response(JSON.stringify({ error: 'Faça login para continuar.' }), { status: 401 }));
    render(<ProfileCard onLogout={() => undefined} />);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await screen.findByRole('button', { name: 'Sair' });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('still links to the profile page while the profile cannot be loaded', async () => {
    stubProfile(() => new Response(JSON.stringify({ error: 'Erro ao carregar o perfil.' }), { status: 500 }));
    render(<ProfileCard />);

    expect(await screen.findByRole('link', { name: /seu perfil/i })).toHaveAttribute('href', '#/configuracoes');
  });
});
