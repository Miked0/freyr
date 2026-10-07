import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomCategoriesCard } from './CustomCategoriesCard';
import { useExpenses } from '@/store/expenses';

interface Row { id: string; name: string; is_custom: boolean }

const defaults: Row[] = [{ id: 'd1', name: 'Mercado', is_custom: false }, { id: 'd2', name: 'Outros', is_custom: false }];

// The backend is the system boundary: fetch keeps the account's categories and answers like the server.
let fetchMock: ReturnType<typeof vi.fn>;
function stubApi(custom: string[] = [], limit = 10) {
  let rows: Row[] = [...defaults, ...custom.map((name, i) => ({ id: `c${i}`, name, is_custom: true }))];
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/api/categories') && init?.method === 'POST') {
      const { name } = JSON.parse(String(init.body));
      if (rows.some(r => r.name.toLowerCase() === name.toLowerCase())) {
        return new Response(JSON.stringify({ error: `Você já tem a categoria ${name}.` }), { status: 409 });
      }
      if (rows.filter(r => r.is_custom).length >= limit) {
        return new Response(JSON.stringify({ error: `Você já criou ${limit} categorias, o máximo do seu plano.` }), { status: 403 });
      }
      const row = { id: `n${rows.length}`, name, is_custom: true };
      rows = [...rows, row];
      return new Response(JSON.stringify(row), { status: 201 });
    }
    if (url.match(/\/api\/categories\/[^/]+$/) && init?.method === 'DELETE') {
      const id = url.split('/').pop();
      rows = rows.filter(r => r.id !== id);
      return new Response(JSON.stringify({ message: 'Categoria apagada.' }));
    }
    if (url.endsWith('/api/categories')) return new Response(JSON.stringify({ categories: rows, custom_limit: limit }));
    if (url.endsWith('/api/expenses/categories/all')) return new Response(JSON.stringify(rows));
    if (url.endsWith('/api/expenses')) return new Response('[]');
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
}

describe('CustomCategoriesCard', () => {
  beforeEach(() => {
    useExpenses.setState({ expenses: [], categories: [], status: 'ready', error: null });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists only the categories the user created, with how many are left', async () => {
    stubApi(['Pets da Luna', 'Viagem a Lisboa']);
    render(<CustomCategoriesCard />);

    const list = await screen.findByRole('list', { name: 'Criadas por você' });
    expect(within(list).getAllByRole('listitem').map(li => li.textContent)).toEqual([
      expect.stringContaining('Pets da Luna'),
      expect.stringContaining('Viagem a Lisboa'),
    ]);
    expect(screen.getByText(/2 de 10/)).toBeInTheDocument();
  });

  it('creates a category, which the transactions can then use', async () => {
    stubApi();
    render(<CustomCategoriesCard />);

    fireEvent.change(await screen.findByRole('textbox', { name: /nova categoria/i }), { target: { value: 'Pets da Luna' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /criar/i })));

    expect(within(screen.getByRole('list', { name: 'Criadas por você' })).getByText(/Pets da Luna/)).toBeInTheDocument();
    expect(screen.getByText(/1 de 10/)).toBeInTheDocument();
    await waitFor(() => expect(useExpenses.getState().categories).toContain('Pets da Luna'));
    expect(screen.getByRole('textbox', { name: /nova categoria/i })).toHaveValue('');
  });

  it('says why the server refused a name and keeps what was typed', async () => {
    stubApi(['Pets da Luna']);
    render(<CustomCategoriesCard />);

    fireEvent.change(await screen.findByRole('textbox', { name: /nova categoria/i }), { target: { value: 'mercado' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /criar/i })));

    expect(screen.getByRole('alert')).toHaveTextContent('Você já tem a categoria mercado.');
    expect(screen.getByRole('textbox', { name: /nova categoria/i })).toHaveValue('mercado');
  });

  it('stops offering to create once the plan limit is reached', async () => {
    stubApi(['A', 'B'], 2);
    render(<CustomCategoriesCard />);

    expect(await screen.findByRole('textbox', { name: /nova categoria/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /criar/i })).toBeDisabled();
    expect(screen.getByText(/limite/i)).toBeInTheDocument();
  });

  it('deletes a category after the user confirms, telling where its transactions go', async () => {
    stubApi(['Pets da Luna']);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<CustomCategoriesCard />);

    const button = await screen.findByRole('button', { name: /apagar pets da luna/i });
    await act(async () => fireEvent.click(button));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Outros'));
    expect(screen.queryByText(/Pets da Luna/)).not.toBeInTheDocument();
    expect(screen.getByText(/0 de 10/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/categories\/c0$/), expect.objectContaining({ method: 'DELETE' }));
    confirm.mockRestore();
  });

  it('keeps a category when the user cancels the delete', async () => {
    stubApi(['Pets da Luna']);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<CustomCategoriesCard />);

    fireEvent.click(await screen.findByRole('button', { name: /apagar pets da luna/i }));

    expect(screen.getByText(/Pets da Luna/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: 'DELETE' }));
    confirm.mockRestore();
  });
});
