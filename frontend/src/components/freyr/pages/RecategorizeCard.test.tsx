import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecategorizeCard } from './RecategorizeCard';
import { useExpenses } from '@/store/expenses';

const suggestions = [
  { id: 'a', date: '2026-09-05', amount: 53, description: 'Compra no débito - Mp *adegar7 Sao Paulo Bra', category: 'Outros', type: 'expense', from: 'Outros', to: 'Alimentação' },
  { id: 'b', date: '2026-08-16', amount: 50, description: 'SAQUE BANCO 24H', category: 'Outros', type: 'expense', from: 'Outros', to: 'Saques' },
];

let fetchMock: ReturnType<typeof vi.fn>;
function stubApi(listed: unknown[] = suggestions) {
  let left = listed;
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/api/expenses/recategorize') && init?.method === 'POST') {
      const ids = JSON.parse(String(init.body)).ids;
      left = [];
      return new Response(JSON.stringify({ updated: ids.length }));
    }
    if (url.endsWith('/api/expenses/recategorize')) return new Response(JSON.stringify({ suggestions: left }));
    if (url.endsWith('/api/expenses/categories/all')) return new Response('[]');
    if (url.endsWith('/api/expenses')) return new Response('[]');
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
}

describe('RecategorizeCard', () => {
  beforeEach(() => {
    useExpenses.setState({ expenses: [], categories: [], status: 'ready', error: null });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows nothing when every category is already right', async () => {
    stubApi([]);
    const { container } = render(<RecategorizeCard />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each entry with its current and suggested category', async () => {
    stubApi();
    render(<RecategorizeCard />);

    expect(await screen.findByText(/2 transações podem ganhar uma categoria melhor/i)).toBeInTheDocument();
    const adega = screen.getByText('Compra no débito - Mp *adegar7 Sao Paulo Bra').closest('li')!;
    expect(adega).toHaveTextContent('Outros → Alimentação');
    expect(screen.getByText('SAQUE BANCO 24H').closest('li')).toHaveTextContent('Outros → Saques');
  });

  it('applies the listed suggestions and reloads the entries', async () => {
    stubApi();
    render(<RecategorizeCard />);

    fireEvent.click(await screen.findByRole('button', { name: /aplicar 2 categorias/i }));

    expect(await screen.findByText(/2 transações recategorizadas/i)).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/recategorize') && init?.method === 'POST')!;
    expect(JSON.parse(call[1].body).ids).toEqual(['a', 'b']);
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/api/expenses'))).toBe(true);
  });
});
