import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '@/api';
import type { Expense } from '@/lib/finance';
import { resetProfile } from '@/lib/useProfile';
import { useExpenses } from '@/store/expenses';
import { SettingsPage } from './SettingsPage';

const PROFILE: Profile = { username: 'mike', display_name: 'Mike', avatar_color: 'frost', monthly_budget: null, invested_balance: null, invested_balance_on: null };

const entry = (id: string, date: string, source_file: string | null): Expense =>
  ({ id, date, amount: -10, description: id, category: 'Outros', type: 'expense', source_file });

const EXPENSES = [
  entry('a1', '2026-08-03', 'agosto.csv'),
  entry('a2', '2026-08-10', 'agosto.csv'),
  entry('s1', '2026-09-02', 'setembro.csv'),
  entry('m1', '2026-09-05', null),
];

const FILES = [
  { name: 'agosto.csv', transactions: 2, from: '2026-08-03', to: '2026-08-10', importedAt: '2026-09-01' },
  { name: 'setembro.csv', transactions: 1, from: '2026-09-02', to: '2026-09-02', importedAt: '2026-10-01' },
];

let fetchMock: ReturnType<typeof vi.fn>;
function stubApi({ allowed = true } = {}) {
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/api/auth/profile')) return new Response(JSON.stringify(PROFILE));
    if (url.endsWith('/api/expenses/imports')) {
      if (!allowed) return new Response(JSON.stringify({ error: 'Esta função ainda não está liberada para a sua conta.' }), { status: 403 });
      if (init?.method === 'DELETE') return new Response(JSON.stringify({ removed: JSON.parse(String(init.body)).ids.length }));
      return new Response(JSON.stringify({ files: FILES }));
    }
    if (url.endsWith('/api/expenses/categories/all')) return new Response('[]');
    if (url.endsWith('/api/expenses')) return new Response(JSON.stringify(EXPENSES));
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
}

const deleteCalls = () => fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith('/api/expenses/imports') && init?.method === 'DELETE');

describe('SettingsPage', () => {
  beforeEach(() => {
    resetProfile();
    useExpenses.setState({ expenses: EXPENSES, categories: [], status: 'ready', error: null });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lists the sections and the theme choices', async () => {
    stubApi();
    render(<SettingsPage />);

    const nav = screen.getByRole('navigation', { name: /configurações/i });
    for (const name of ['Perfil', 'Aparência', 'Finanças', 'Dados e privacidade', 'Zona de cuidado']) {
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument();
    }
    const theme = screen.getByRole('radiogroup', { name: 'Tema' });
    expect(within(theme).getAllByRole('radio').map(r => r.textContent)).toEqual(['Papel', 'Fiorde', 'Automático']);
    expect(await screen.findByDisplayValue('Mike')).toBeInTheDocument();
  });

  it('hides the history to accounts it is not released to', async () => {
    stubApi({ allowed: false });
    render(<SettingsPage />);

    await screen.findByRole('button', { name: 'Excluir conta…' });
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/api/expenses/imports'))).toBe(true));
    expect(screen.queryByRole('button', { name: 'Apagar histórico…' })).not.toBeInTheDocument();
    expect(screen.queryByText('Extratos enviados')).not.toBeInTheDocument();
  });

  it('deletes only the chosen statement, keeps what was typed by hand and can undo it', async () => {
    stubApi();
    render(<SettingsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Apagar agosto.csv e suas transações' }));
    const dialog = screen.getByRole('dialog', { name: 'Apagar histórico de transações' });
    expect(within(dialog).getByRole('radio', { name: /Extratos escolhidos/ })).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: 'agosto.csv (2)' })).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: 'setembro.csv (1)' })).not.toBeChecked();

    const confirm = within(dialog).getByRole('button', { name: 'Apagar 2 transações' });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Digite APAGAR para confirmar'), { target: { value: 'apagar' } });
    fireEvent.click(confirm);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('2 transações apagadas.')).toBeInTheDocument();
    expect(useExpenses.getState().expenses.map(e => e.id)).toEqual(['s1', 'm1']);
    expect(deleteCalls()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(await screen.findByText('Tudo de volta.')).toBeInTheDocument();
    expect(useExpenses.getState().expenses).toHaveLength(4);
    expect(deleteCalls()).toHaveLength(0);
  });

  it('sends the deletion when the notice closes', async () => {
    stubApi();
    render(<SettingsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Apagar histórico…' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('radio', { name: /Todo o histórico/ })).toBeChecked();
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Baixar uma cópia em CSV antes de apagar' }));
    fireEvent.change(within(dialog).getByLabelText('Digite APAGAR para confirmar'), { target: { value: 'APAGAR' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apagar 3 transações' }));
    expect(URL.createObjectURL).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    await waitFor(() => expect(deleteCalls()).toHaveLength(1));
    expect(JSON.parse(String(deleteCalls()[0][1]?.body)).ids.sort()).toEqual(['a1', 'a2', 's1']);
  });
});
