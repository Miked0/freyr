import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '../api';
import { avatarInitials, displayNameOf, resetProfile, useProfile } from './useProfile';

const PROFILE: Profile = { username: 'ana', display_name: null, avatar_color: 'brand-primary', monthly_budget: null };

type Handler = (init?: RequestInit) => Response | Promise<Response>;

function stubProfileApi(handlers: { get?: Handler; patch?: Handler }) {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    const handler = init?.method === 'PATCH' ? handlers.patch : handlers.get;
    if (!handler) return new Response('{}', { status: 404 });
    return handler(init);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('useProfile', () => {
  beforeEach(() => resetProfile());
  afterEach(() => vi.unstubAllGlobals());

  it('loads the profile on first use and shares it between components', async () => {
    const fetchMock = stubProfileApi({ get: () => json(PROFILE) });

    const first = renderHook(() => useProfile());
    await waitFor(() => expect(first.result.current.status).toBe('ready'));
    expect(first.result.current.profile).toEqual(PROFILE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/auth\/profile$/);

    // A component mounted later shows the profile at once and refreshes it in the background.
    const second = renderHook(() => useProfile());
    expect(second.result.current.profile).toEqual(PROFILE);
    expect(second.result.current.status).toBe('ready');
  });

  it('asks the server once when several components mount together', async () => {
    const fetchMock = stubProfileApi({ get: () => json(PROFILE) });

    renderHook(() => { useProfile(); useProfile(); });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it('is unavailable, without an error, when there is no logged-in account', async () => {
    stubProfileApi({ get: () => json({ error: 'Faça login para continuar.' }, 401) });

    const { result } = renderHook(() => useProfile());

    await waitFor(() => expect(result.current.status).toBe('unavailable'));
    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('keeps showing the profile when a refresh fails', async () => {
    let fail = false;
    stubProfileApi({ get: () => (fail ? json({ error: 'Erro ao carregar o perfil.' }, 500) : json(PROFILE)) });
    const first = renderHook(() => useProfile());
    await waitFor(() => expect(first.result.current.status).toBe('ready'));

    fail = true;
    const second = renderHook(() => useProfile());

    await waitFor(() => expect(second.result.current.error).toBe('Erro ao carregar o perfil.'));
    expect(second.result.current.profile).toEqual(PROFILE);
    expect(second.result.current.status).toBe('ready');
  });

  it('reports a failed load', async () => {
    stubProfileApi({ get: () => json({ error: 'Erro ao carregar o perfil.' }, 500) });

    const { result } = renderHook(() => useProfile());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Erro ao carregar o perfil.');
  });

  it('sends only the changed fields and keeps what the server answers', async () => {
    const saved = { ...PROFILE, display_name: 'Ana Souza', avatar_color: 'frost' as const };
    const fetchMock = stubProfileApi({ get: () => json(PROFILE), patch: () => json(saved) });
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() => result.current.save({ display_name: 'Ana Souza', avatar_color: 'frost' }));

    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ display_name: 'Ana Souza', avatar_color: 'frost' });
    expect(result.current.profile).toEqual(saved);
  });

  it('does not let a refresh that started before a save bring back the older profile', async () => {
    const saved = { ...PROFILE, display_name: 'Ana Souza' };
    let answerRefresh: (r: Response) => void = () => undefined;
    let gets = 0;
    stubProfileApi({
      get: () => (++gets === 1 ? json(PROFILE) : new Promise<Response>(resolve => { answerRefresh = resolve; })),
      patch: () => json(saved),
    });
    const first = renderHook(() => useProfile());
    await waitFor(() => expect(first.result.current.status).toBe('ready'));
    renderHook(() => useProfile());
    await waitFor(() => expect(gets).toBe(2));

    await act(() => first.result.current.save({ display_name: 'Ana Souza' }));
    await act(async () => answerRefresh(json(PROFILE)));

    expect(first.result.current.profile).toEqual(saved);
  });

  it('keeps the previous profile and rethrows when saving fails', async () => {
    stubProfileApi({ get: () => json(PROFILE), patch: () => json({ error: 'Cor do avatar inválida.' }, 400) });
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await expect(result.current.save({ avatar_color: 'frost' })).rejects.toThrow('Cor do avatar inválida.');
    });
    expect(result.current.profile).toEqual(PROFILE);
  });

  it('forgets the profile on reset so the next account loads its own', async () => {
    const fetchMock = stubProfileApi({ get: () => json(PROFILE) });
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => resetProfile());

    expect(result.current.profile).toBeNull();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});

describe('profile helpers', () => {
  it('falls back to the username when there is no display name', () => {
    expect(displayNameOf(PROFILE)).toBe('ana');
    expect(displayNameOf({ ...PROFILE, display_name: 'Ana Souza' })).toBe('Ana Souza');
  });

  it('takes the initials of the first and last words', () => {
    expect(avatarInitials('Ana Souza')).toBe('AS');
    expect(avatarInitials('ana maria de souza')).toBe('AS');
    expect(avatarInitials('ana')).toBe('AN');
    expect(avatarInitials('  é  ')).toBe('É');
    expect(avatarInitials('')).toBe('?');
  });
});
