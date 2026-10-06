import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TransactionList, { NEW_CATEGORY } from './TransactionList';
import { useExpenses } from '@/store/expenses';

const rows = [
  { id: 'e1', date: '2026-09-06', amount: 1500, description: 'Aluguel', category: 'Moradia', type: 'expense' },
  { id: 'i1', date: '2026-09-05', amount: 5000, description: 'Salário ACME', category: 'Salário', type: 'income' },
];

// The backend is the system boundary: fetch answers the list routes and records writes.
let fetchMock: ReturnType<typeof vi.fn>;
function stubApi(list: unknown = rows) {
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') return new Response('{}', { status: 200 });
    if (url.endsWith('/api/categories') && init?.method === 'POST') {
      const { name } = JSON.parse(String(init.body));
      if (name === 'Cheia') return new Response(JSON.stringify({ error: 'Você já criou 10 categorias, o máximo do seu plano.' }), { status: 403 });
      return new Response(JSON.stringify({ id: 'c1', name, is_custom: true }), { status: 201 });
    }
    if (url.endsWith('/api/expenses/categories/all')) return new Response(JSON.stringify([{ name: 'Moradia' }, { name: 'Salário' }]));
    if (url.endsWith('/api/expenses')) return list instanceof Error ? Promise.reject(list) : new Response(JSON.stringify(list));
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
}

async function renderLoaded() {
  await act(() => useExpenses.getState().load());
  render(<TransactionList />);
}

describe('TransactionList', () => {
  beforeEach(() => {
    useExpenses.setState({ expenses: [], categories: [], status: 'idle', error: null });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('signs income and spending and totals them as a balance', async () => {
    stubApi();
    await renderLoaded();

    expect(screen.getByText('Salário ACME').closest('tr')).toHaveTextContent('+R$ 5.000,00');
    expect(screen.getByText('Aluguel').closest('tr')).toHaveTextContent('−R$ 1.500,00');
    expect(screen.getByText(/saldo/i)).toHaveTextContent('+R$ 3.500,00');
  });

  it('lets the user reclassify a spending entry as income', async () => {
    stubApi();
    await renderLoaded();

    const row = screen.getByText('Aluguel').closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: /editar aluguel/i }));
    fireEvent.change(screen.getByRole('combobox', { name: /tipo/i }), { target: { value: 'income' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /salvar/i })));

    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(put?.[0]).toMatch(/\/api\/expenses\/e1$/);
    expect(JSON.parse(put?.[1].body)).toEqual({ type: 'income' });
    expect(screen.getByText('Aluguel').closest('tr')).toHaveTextContent('+R$ 1.500,00');
  });

  it('shows a card refund as money back that lowers the spending', async () => {
    stubApi([...rows, { id: 'r1', date: '2026-09-07', amount: -120, description: 'Estorno Loja X', category: 'Compras', type: 'expense' }]);
    await renderLoaded();

    expect(screen.getByText('Estorno Loja X').closest('tr')).toHaveTextContent('+R$ 120,00');
    expect(screen.getByText(/saldo/i)).toHaveTextContent('+R$ 3.620,00');
  });

  it('shows a negative balance with a minus sign', async () => {
    stubApi([rows[0]]);
    await renderLoaded();

    expect(screen.getByText(/saldo/i)).toHaveTextContent('−R$ 1.500,00');
  });

  it('edits a refund without asking for a positive amount', async () => {
    stubApi([...rows, { id: 'r1', date: '2026-09-07', amount: -120, description: 'Estorno Loja X', category: 'Compras', type: 'expense' }]);
    await renderLoaded();

    const row = screen.getByText('Estorno Loja X').closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: /editar estorno loja x/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /descrição/i }), { target: { value: 'Estorno da loja' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /salvar/i })));

    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(put?.[1].body)).toEqual({ description: 'Estorno da loja' });
  });

  it('keeps showing the list when a later reload fails', async () => {
    stubApi();
    await renderLoaded();

    stubApi(new TypeError('Failed to fetch'));
    await act(() => useExpenses.getState().load());

    expect(screen.getByText('Aluguel')).toBeInTheDocument();
  });

  it('creates a category while editing an entry and files the entry under it', async () => {
    stubApi();
    await renderLoaded();

    const row = screen.getByText('Aluguel').closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: /editar aluguel/i }));
    fireEvent.change(within(row).getByRole('combobox', { name: /^categoria$/i }), { target: { value: NEW_CATEGORY } });
    fireEvent.change(screen.getByRole('textbox', { name: /nome da nova categoria/i }), { target: { value: 'Apê da praia' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /salvar/i })));

    const post = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/api/categories') && init?.method === 'POST');
    expect(JSON.parse(post?.[1].body)).toEqual({ name: 'Apê da praia' });
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(put?.[1].body)).toEqual({ category: 'Apê da praia' });
    expect(screen.getByText('Aluguel').closest('tr')).toHaveTextContent('APÊ DA PRAIA');
    expect(useExpenses.getState().categories).toContain('Apê da praia');
  });

  it('keeps the entry as it was when the new category is refused', async () => {
    stubApi();
    await renderLoaded();

    const row = screen.getByText('Aluguel').closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: /editar aluguel/i }));
    fireEvent.change(within(row).getByRole('combobox', { name: /^categoria$/i }), { target: { value: NEW_CATEGORY } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /salvar/i })));
    expect(screen.getByRole('alert')).toHaveTextContent('Dê um nome à nova categoria.');

    fireEvent.change(screen.getByRole('textbox', { name: /nome da nova categoria/i }), { target: { value: 'Cheia' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /salvar/i })));

    expect(screen.getByRole('alert')).toHaveTextContent('o máximo do seu plano');
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false);
  });
});
