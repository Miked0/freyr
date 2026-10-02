import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RepeatedImportsCard } from './RepeatedImportsCard';
import { useExpenses } from '@/store/expenses';

const copies = [
  { id: 'c1', date: '2026-09-10', amount: 50, description: 'MERCADO', category: 'Mercado', type: 'expense' },
  { id: 'c2', date: '2026-09-08', amount: 12.5, description: 'PADARIA', category: 'Alimentação', type: 'expense' },
];

let fetchMock: ReturnType<typeof vi.fn>;
function stubApi(repeated: unknown[] = copies) {
  let left = repeated;
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/api/expenses/repeated/remove')) {
      left = [];
      return new Response(JSON.stringify({ removed: JSON.parse(String(init!.body)).ids.length }));
    }
    if (url.endsWith('/api/expenses/repeated')) return new Response(JSON.stringify({ expenses: left }));
    if (url.endsWith('/api/expenses/categories/all')) return new Response('[]');
    if (url.endsWith('/api/expenses')) return new Response('[]');
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
}

describe('RepeatedImportsCard', () => {
  beforeEach(() => {
    useExpenses.setState({ expenses: [], categories: [], status: 'ready', error: null });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows nothing when no transaction was imported twice', async () => {
    stubApi([]);
    const { container } = render(<RepeatedImportsCard />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('says how many copies there are and which ones', async () => {
    stubApi();
    render(<RepeatedImportsCard />);

    expect(await screen.findByText(/2 transações aparecem mais de uma vez/i)).toBeInTheDocument();
    expect(screen.getByText('MERCADO').closest('li')).toHaveTextContent('R$ 50,00');
    expect(screen.getByText('PADARIA')).toBeInTheDocument();
  });

  it('removes exactly the listed copies after the user confirms', async () => {
    stubApi();
    render(<RepeatedImportsCard />);

    fireEvent.click(await screen.findByRole('button', { name: /remover 2 cópias/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^remover$/i }));

    expect(await screen.findByText(/2 cópias removidas/i)).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/repeated/remove'))!;
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body).ids).toEqual(['c1', 'c2']);
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/api/expenses'))).toBe(true);
  });

  it('keeps the copies when the user cancels', async () => {
    stubApi();
    render(<RepeatedImportsCard />);

    fireEvent.click(await screen.findByRole('button', { name: /remover 2 cópias/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /cancelar/i }));

    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/repeated/remove'))).toBe(false);
  });
});
