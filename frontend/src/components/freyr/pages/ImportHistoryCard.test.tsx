import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportHistoryCard } from './ImportHistoryCard';
import { useExpenses } from '@/store/expenses';

const files = [
  { name: 'extrato-set.csv', transactions: 12 },
  { name: 'fatura.pdf', transactions: 1 },
];

let fetchMock: ReturnType<typeof vi.fn>;
function stubApi({ allowed = true, history = files }: { allowed?: boolean; history?: unknown[] } = {}) {
  let left = history;
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/api/expenses/imports')) {
      if (!allowed) return new Response(JSON.stringify({ error: 'Esta função ainda não está liberada para a sua conta.' }), { status: 403 });
      if (init?.method === 'DELETE') {
        left = [];
        return new Response(JSON.stringify({ removed: 13 }));
      }
      return new Response(JSON.stringify({ files: left }));
    }
    if (url.endsWith('/api/expenses/categories/all')) return new Response('[]');
    if (url.endsWith('/api/expenses')) return new Response('[]');
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
}

const deleteCalls = () => fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith('/api/expenses/imports') && init?.method === 'DELETE');

describe('ImportHistoryCard', () => {
  beforeEach(() => {
    useExpenses.setState({ expenses: [], categories: [], status: 'ready', error: null });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows nothing to accounts the feature is not released to', async () => {
    stubApi({ allowed: false });
    const { container } = render(<ImportHistoryCard />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('shows nothing when no file was imported', async () => {
    stubApi({ history: [] });
    const { container } = render(<ImportHistoryCard />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each imported file with its transaction count', async () => {
    stubApi();
    render(<ImportHistoryCard />);

    expect((await screen.findByText('extrato-set.csv')).closest('li')).toHaveTextContent('12 transações');
    expect(screen.getByText('fatura.pdf').closest('li')).toHaveTextContent('1 transação');
  });

  it('deletes the import history after the user confirms', async () => {
    stubApi();
    render(<ImportHistoryCard />);

    fireEvent.click(await screen.findByRole('button', { name: /apagar histórico de arquivos/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^apagar$/i }));

    expect(await screen.findByText(/13 transações importadas apagadas/i)).toBeInTheDocument();
    expect(deleteCalls()).toHaveLength(1);
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/api/expenses'))).toBe(true);
  });

  it('keeps everything when the user cancels', async () => {
    stubApi();
    render(<ImportHistoryCard />);

    fireEvent.click(await screen.findByRole('button', { name: /apagar histórico de arquivos/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /cancelar/i }));

    expect(deleteCalls()).toHaveLength(0);
  });
});
