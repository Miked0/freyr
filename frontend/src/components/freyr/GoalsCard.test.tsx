import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoalsCard } from './GoalsCard';
import { useGoals } from '@/store/goals';
import { goalsApi, type Goal } from '@/lib/goalsApi';

vi.mock('@/lib/goalsApi', () => ({
  goalsApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const goal = (id: string, due: string | null): Goal => ({ id, name: `Meta ${id}`, target: 1000, saved: 250, due });

describe('GoalsCard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useGoals.setState({ goals: [], status: 'ready', error: null });
  });

  it('links to every goal', () => {
    render(<GoalsCard />);
    expect(screen.getByRole('heading', { name: 'Metas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Todas' })).toHaveAttribute('href', '#/metas');
  });

  it('shows up to four goals, nearest due date first', () => {
    useGoals.setState({ goals: [goal('e', null), goal('a', '2027-05'), goal('b', '2026-11'), goal('c', '2027-01'), goal('d', '2026-12')] });
    render(<GoalsCard />);

    const bars = screen.getAllByRole('progressbar');
    expect(bars.map(b => b.getAttribute('aria-label'))).toEqual(['Meta b', 'Meta d', 'Meta c', 'Meta a']);
    expect(screen.getByText(/· nov 2026$/)).toBeInTheDocument();
  });

  it('invites the user to create a goal when there are none', () => {
    render(<GoalsCard />);
    expect(screen.getByText(/crie uma meta/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar minha primeira meta' })).toHaveAttribute('href', '#/metas');
  });

  it('loads the goals the first time it shows', async () => {
    useGoals.setState({ status: 'idle' });
    vi.mocked(goalsApi.list).mockResolvedValue([goal('a', null)]);
    render(<GoalsCard />);

    expect(await screen.findByRole('progressbar', { name: 'Meta a' })).toBeInTheDocument();
    await waitFor(() => expect(goalsApi.list).toHaveBeenCalledTimes(1));
  });

  it('says so when the goals fail to load', () => {
    useGoals.setState({ status: 'error', error: 'Sem conexão' });
    render(<GoalsCard />);
    expect(screen.getByText(/não foi possível carregar/i)).toBeInTheDocument();
  });
});
