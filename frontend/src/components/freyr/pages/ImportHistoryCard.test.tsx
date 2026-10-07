import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
        const names: string[] = JSON.parse(String(init.body)).files;
        const gone = (left as typeof files).filter(f => names.includes(f.name));
        left = (left as typeof files).filter(f => !names.includes(f.name));
        return new Response(JSON.stringify({ removed: gone.reduce((sum, f) => sum + f.transactions, 0) }));
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

  it('says so when no file was imported', async () => {
    stubApi({ history: [] });
    render(<ImportHistoryCard />);

    expect(await screen.findByText('Nenhum arquivo importado por enquanto.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apagar/i })).not.toBeInTheDocument();
  });

  it('lists each imported file with its transaction count', async () => {
    stubApi();
    render(<ImportHistoryCard />);

    expect((await screen.findByText('extrato-set.csv')).closest('li')).toHaveTextContent('12 transações');
    expect(screen.getByText('fatura.pdf').closest('li')).toHaveTextContent('1 transação');
  });

  it('deletes only the files the user picked, after confirming', async () => {
    stubApi();
    render(<ImportHistoryCard />);

    const remove = await screen.findByRole('button', { name: /apagar selecionados/i });
    expect(remove).toBeDisabled();
    fireEvent.click(screen.getByLabelText('fatura.pdf'));
    expect(screen.getByText(/1 arquivo/).closest('p')).toHaveTextContent('1 arquivo · 1 transação');
    fireEvent.click(remove);
    expect(screen.getByRole('group')).toHaveTextContent('Apagar 1 transação de 1 arquivo? Não dá para desfazer.');
    fireEvent.click(screen.getByRole('button', { name: /apagar de vez/i }));

    expect(await screen.findByText('1 transação apagada de 1 arquivo.')).toBeInTheDocument();
    expect(deleteCalls()).toHaveLength(1);
    expect(JSON.parse(String(deleteCalls()[0][1]!.body))).toEqual({ files: ['fatura.pdf'] });
    expect(screen.queryByText('fatura.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('extrato-set.csv')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/api/expenses'))).toBe(true);
  });

  it('selects every file at once', async () => {
    stubApi();
    render(<ImportHistoryCard />);

    fireEvent.click(await screen.findByLabelText('Selecionar todos'));
    expect(screen.getByLabelText('extrato-set.csv')).toBeChecked();
    expect(screen.getByLabelText('fatura.pdf')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /apagar selecionados/i }));
    expect(screen.getByRole('group')).toHaveTextContent('Apagar 13 transações de 2 arquivos?');
  });

  it('keeps everything when the user cancels', async () => {
    stubApi();
    render(<ImportHistoryCard />);

    fireEvent.click(await screen.findByLabelText('fatura.pdf'));
    fireEvent.click(screen.getByRole('button', { name: /apagar selecionados/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(deleteCalls()).toHaveLength(0);
    expect(screen.getByRole('button', { name: /apagar selecionados/i })).toBeEnabled();
  });
});
