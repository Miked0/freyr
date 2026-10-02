import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '@/api';
import { parseBudget, resetProfile } from '@/lib/useProfile';
import { ProfileCard } from './ProfileCard';
import { ProfilePage } from './ProfilePage';

const PROFILE: Profile = { username: 'ana', display_name: null, avatar_color: 'brand-primary', monthly_budget: null };

type Handler = (body: Record<string, unknown>) => Response | Promise<Response>;

function stubApi({ get = () => json(PROFILE), patch }: { get?: () => Response; patch?: Handler } = {}) {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') return patch ? patch(JSON.parse(String(init.body))) : json({}, 404);
    return get();
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const patchBodies = (fetchMock: ReturnType<typeof stubApi>) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH').map(([, init]) => JSON.parse(String(init?.body)));

async function renderLoaded(profile: Profile = PROFILE, patch?: Handler) {
  const fetchMock = stubApi({ get: () => json(profile), patch });
  render(<ProfilePage />);
  await screen.findByRole('textbox', { name: /nome de exibição/i });
  return fetchMock;
}

const nameInput = () => screen.getByRole('textbox', { name: /nome de exibição/i });
const budgetInput = () => screen.getByRole('textbox', { name: /meta de gasto mensal/i });
const saveButton = () => screen.getByRole('button', { name: /salvar/i });

describe('ProfilePage', () => {
  beforeEach(() => resetProfile());
  afterEach(() => vi.unstubAllGlobals());

  it('says it is loading before the profile arrives', () => {
    stubApi({ get: () => new Promise<Response>(() => undefined) as unknown as Response });
    render(<ProfilePage />);
    expect(screen.getByRole('status')).toHaveTextContent(/carregando/i);
  });

  it('fills the form with the saved profile', async () => {
    await renderLoaded({ ...PROFILE, display_name: 'Ana Souza', avatar_color: 'frost', monthly_budget: 3500.5 });

    expect(nameInput()).toHaveValue('Ana Souza');
    expect(nameInput()).toHaveAttribute('maxLength', '40');
    expect(screen.getByRole('radio', { name: 'Geada' })).toBeChecked();
    expect(budgetInput()).toHaveValue('3.500,50');
    expect(screen.getByText('@ana')).toBeInTheDocument();
  });

  it('offers the six design-system colors as labelled swatches', async () => {
    await renderLoaded();
    const group = screen.getByRole('radiogroup', { name: /cor do avatar/i });
    expect(within(group).getAllByRole('radio').map(r => r.getAttribute('aria-label') ?? r.closest('label')?.textContent))
      .toEqual(['Aurora', 'Geada', 'Colheita', 'Floresta', 'Brasa', 'Noite']);
  });

  it('previews the avatar live as the name and color change', async () => {
    await renderLoaded();
    const preview = screen.getByTestId('profile-preview');
    expect(within(preview).getByText('AN')).toHaveStyle({ background: 'var(--brand-primary)' });

    fireEvent.change(nameInput(), { target: { value: 'Bia Lima' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Brasa' }));

    expect(within(preview).getByText('Bia Lima')).toBeInTheDocument();
    expect(within(preview).getByText('BL')).toHaveStyle({ background: 'var(--alert)' });
  });

  it('keeps "Salvar" disabled until something changes', async () => {
    await renderLoaded();
    expect(saveButton()).toBeDisabled();
    fireEvent.change(nameInput(), { target: { value: 'Ana' } });
    expect(saveButton()).toBeEnabled();
  });

  it('saves only the changed fields, shows progress, then confirms', async () => {
    let answer: (r: Response) => void = () => undefined;
    const fetchMock = await renderLoaded(PROFILE, () => new Promise<Response>(resolve => { answer = resolve; }));

    fireEvent.change(nameInput(), { target: { value: '  Ana Souza ' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Floresta' }));
    fireEvent.change(budgetInput(), { target: { value: '2.500,00' } });
    fireEvent.click(saveButton());

    expect(await screen.findByRole('button', { name: /salvando/i })).toBeDisabled();
    expect(patchBodies(fetchMock)).toEqual([{ display_name: 'Ana Souza', avatar_color: 'positive', monthly_budget: 2500 }]);

    await act(async () => answer(json({ ...PROFILE, display_name: 'Ana Souza', avatar_color: 'positive', monthly_budget: 2500 })));

    expect(await screen.findByRole('status')).toHaveTextContent('Perfil salvo.');
    expect(saveButton()).toBeDisabled();
  });

  it('clears the display name and the budget when the fields are emptied', async () => {
    const fetchMock = await renderLoaded({ ...PROFILE, display_name: 'Ana', monthly_budget: 100 }, body => json({ ...PROFILE, ...body }));

    fireEvent.change(nameInput(), { target: { value: '   ' } });
    fireEvent.change(budgetInput(), { target: { value: '' } });
    fireEvent.click(saveButton());

    await screen.findByText('Perfil salvo.');
    expect(patchBodies(fetchMock)).toEqual([{ display_name: null, monthly_budget: null }]);
  });

  it('explains a budget it cannot read without calling the server', async () => {
    const fetchMock = await renderLoaded();

    fireEvent.change(budgetInput(), { target: { value: 'muito' } });
    fireEvent.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(/meta/i);
    expect(budgetInput()).toHaveAttribute('aria-invalid', 'true');
    expect(patchBodies(fetchMock)).toEqual([]);
  });

  it('shows the server error and keeps what the user typed', async () => {
    await renderLoaded(PROFILE, () => json({ error: 'Erro ao salvar o perfil.' }, 500));

    fireEvent.change(nameInput(), { target: { value: 'Ana' } });
    fireEvent.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro ao salvar o perfil.');
    expect(nameInput()).toHaveValue('Ana');
    expect(saveButton()).toBeEnabled();
  });

  it('updates the sidebar card once saved', async () => {
    stubApi({ patch: body => json({ ...PROFILE, ...body }) });
    render(<><ProfileCard /><ProfilePage /></>);
    await screen.findByRole('textbox', { name: /nome de exibição/i });

    fireEvent.change(nameInput(), { target: { value: 'Ana Souza' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(screen.getByRole('link', { name: /editar perfil/i })).toHaveTextContent('Ana Souza'));
  });

  it('explains that there is no profile without a logged-in account', async () => {
    stubApi({ get: () => json({ error: 'Faça login para continuar.' }, 401) });
    render(<ProfilePage />);
    expect(await screen.findByText(/entra com uma conta/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('offers to retry when the profile cannot be loaded', async () => {
    let fail = true;
    stubApi({ get: () => (fail ? json({ error: 'Erro ao carregar o perfil.' }, 500) : json(PROFILE)) });
    render(<ProfilePage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro ao carregar o perfil.');
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: /tentar de novo/i }));

    expect(await screen.findByRole('textbox', { name: /nome de exibição/i })).toBeInTheDocument();
  });
});

describe('parseBudget', () => {
  it.each([
    ['', null],
    ['   ', null],
    ['2500', 2500],
    ['2.500', 2500],
    ['2.500,50', 2500.5],
    ['R$ 1.234.567,89', 1234567.89],
    ['99,9', 99.9],
    ['12.5', 12.5],
    ['0', 0],
  ])('reads %j as %j', (input, expected) => {
    expect(parseBudget(input)).toBe(expected);
  });

  it.each(['muito', '-10', '1,2,3', '2.50.0', '1e3'])('rejects %j', input => {
    expect(parseBudget(input)).toBeUndefined();
  });
});
