import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoalsPage } from './GoalsPage';
import { useGoals } from '@/store/goals';
import { goalsApi, type Goal } from '@/lib/goalsApi';

vi.mock('@/lib/goalsApi', () => ({
  goalsApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const api = vi.mocked(goalsApi);
const reserva: Goal = { id: 'a', name: 'Reserva', target: 1000, saved: 250, due: '2026-12' };
const viagem: Goal = { id: 'b', name: 'Viagem', target: 5000, saved: 0, due: null };

const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const form = () => screen.getByRole('form');

describe('GoalsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useGoals.setState({ goals: [reserva, viagem], status: 'ready', error: null });
  });

  it('shows that goals are loading', () => {
    useGoals.setState({ goals: [], status: 'loading' });
    render(<GoalsPage />);
    expect(screen.getByText(/carregando metas/i)).toBeInTheDocument();
  });

  it('loads the goals when it opens', async () => {
    useGoals.setState({ goals: [], status: 'idle' });
    api.list.mockResolvedValue([reserva]);
    render(<GoalsPage />);
    expect(await screen.findByRole('progressbar', { name: 'Reserva' })).toBeInTheDocument();
  });

  it('reports a failed load and retries', async () => {
    useGoals.setState({ goals: [], status: 'error', error: 'Sem conexão' });
    api.list.mockResolvedValue([viagem]);
    render(<GoalsPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('progressbar', { name: 'Viagem' })).toBeInTheDocument();
  });

  it('explains what a goal is when there are none', () => {
    useGoals.setState({ goals: [] });
    render(<GoalsPage />);
    expect(screen.getByText(/toda conquista começa/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar meta' })).toBeInTheDocument();
  });

  it('lists every goal with its progress', () => {
    render(<GoalsPage />);
    expect(screen.getAllByRole('progressbar').map(b => b.getAttribute('aria-label'))).toEqual(['Reserva', 'Viagem']);
    expect(screen.getByText(/· dez 2026$/)).toBeInTheDocument();
  });

  it('creates a goal from the form', async () => {
    const created: Goal = { id: 'c', name: 'Notebook', target: 7500.5, saved: 100, due: '2027-03' };
    api.create.mockResolvedValue(created);
    render(<GoalsPage />);

    type('Nome', '  Notebook ');
    type('Valor-alvo', '7.500,50');
    type('Já guardado', '100');
    type(/Prazo/, '2027-03');
    fireEvent.click(within(form()).getByRole('button', { name: 'Criar meta' }));

    await waitFor(() => expect(api.create).toHaveBeenCalledWith({ name: 'Notebook', target: 7500.5, saved: 100, due: '2027-03' }));
    expect(await screen.findByRole('progressbar', { name: 'Notebook' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('');
  });

  it('checks the form before sending it', () => {
    render(<GoalsPage />);

    fireEvent.click(within(form()).getByRole('button', { name: 'Criar meta' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/nome/i);

    type('Nome', 'Carro');
    type('Valor-alvo', '0');
    fireEvent.click(within(form()).getByRole('button', { name: 'Criar meta' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/valor-alvo/i);
    expect(api.create).not.toHaveBeenCalled();
  });

  it("shows the server's error when saving fails", async () => {
    api.create.mockRejectedValue(new Error('Não foi possível criar a meta.'));
    render(<GoalsPage />);
    type('Nome', 'Carro');
    type('Valor-alvo', '30000');
    fireEvent.click(within(form()).getByRole('button', { name: 'Criar meta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível criar a meta.');
  });

  it('edits a goal in the same form', async () => {
    api.update.mockResolvedValue({ ...reserva, name: 'Reserva de emergência', due: null });
    render(<GoalsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Editar Reserva' }));
    expect(screen.getByRole('heading', { name: 'Editar meta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Reserva');
    expect(screen.getByLabelText('Valor-alvo')).toHaveValue('1000,00');

    type('Nome', 'Reserva de emergência');
    type(/Prazo/, '');
    fireEvent.click(within(form()).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.update).toHaveBeenCalledWith('a', { name: 'Reserva de emergência', target: 1000, saved: 250, due: null }));
    expect(await screen.findByRole('heading', { name: 'Nova meta' })).toBeInTheDocument();
  });

  it('cancels an edit', () => {
    render(<GoalsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar Reserva' }));
    fireEvent.click(within(form()).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { name: 'Nova meta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('');
  });

  it('adds a deposit to what a goal has saved', async () => {
    api.update.mockResolvedValue({ ...reserva, saved: 400.5 });
    render(<GoalsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar valor em Reserva' }));
    type('Valor a guardar em Reserva', '150,50');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(api.update).toHaveBeenCalledWith('a', { saved: 400.5 }));
    await waitFor(() => expect(screen.queryByLabelText('Valor a guardar em Reserva')).not.toBeInTheDocument());
  });

  it('deletes a goal only after confirming', async () => {
    api.remove.mockResolvedValue(undefined);
    render(<GoalsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Reserva' }));
    fireEvent.click(screen.getByRole('button', { name: 'Manter' }));
    expect(api.remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Reserva' }));
    expect(screen.getByText(/excluir a meta reserva\?/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('a'));
    await waitFor(() => expect(screen.queryByRole('progressbar', { name: 'Reserva' })).not.toBeInTheDocument());
  });
});
