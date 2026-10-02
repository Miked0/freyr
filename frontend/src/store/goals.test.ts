import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDue, parseAmount, useGoals } from './goals';
import { goalsApi, type Goal } from '@/lib/goalsApi';

vi.mock('@/lib/goalsApi', () => ({
  goalsApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const api = vi.mocked(goalsApi);
const goal = (over: Partial<Goal>): Goal => ({ id: 'g', name: 'Meta', target: 1000, saved: 0, due: null, ...over });

describe('useGoals', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useGoals.setState({ goals: [], status: 'idle', error: null });
  });

  it('loads the goals', async () => {
    api.list.mockResolvedValue([goal({ id: 'a' })]);
    await useGoals.getState().load();
    expect(useGoals.getState()).toMatchObject({ goals: [goal({ id: 'a' })], status: 'ready', error: null });
  });

  it('reports a failed first load', async () => {
    api.list.mockRejectedValue(new Error('Sem conexão'));
    await useGoals.getState().load();
    expect(useGoals.getState()).toMatchObject({ status: 'error', error: 'Sem conexão' });
  });

  it('keeps goals sorted by due date as they are created and edited', async () => {
    useGoals.setState({ status: 'ready', goals: [goal({ id: 'a', due: '2027-01' }), goal({ id: 'b', due: null })] });

    api.create.mockResolvedValue(goal({ id: 'c', due: '2026-11' }));
    await useGoals.getState().create({ name: 'Meta', target: 1000, saved: 0, due: '2026-11' });
    expect(useGoals.getState().goals.map(g => g.id)).toEqual(['c', 'a', 'b']);

    api.update.mockResolvedValue(goal({ id: 'b', due: '2026-10' }));
    await useGoals.getState().update('b', { due: '2026-10' });
    expect(useGoals.getState().goals.map(g => g.id)).toEqual(['b', 'c', 'a']);
  });

  it('adds a deposit to what is saved', async () => {
    useGoals.setState({ status: 'ready', goals: [goal({ id: 'a', saved: 250 })] });
    api.update.mockResolvedValue(goal({ id: 'a', saved: 400 }));

    await useGoals.getState().deposit('a', 150);

    expect(api.update).toHaveBeenCalledWith('a', { saved: 400 });
    expect(useGoals.getState().goals[0].saved).toBe(400);
  });

  it('removes a goal', async () => {
    useGoals.setState({ status: 'ready', goals: [goal({ id: 'a' }), goal({ id: 'b' })] });
    api.remove.mockResolvedValue(undefined);
    await useGoals.getState().remove('a');
    expect(useGoals.getState().goals.map(g => g.id)).toEqual(['b']);
  });
});

describe('formatDue', () => {
  it('writes a YYYY-MM month as a short Portuguese label', () => {
    expect(formatDue('2026-12')).toBe('dez 2026');
    expect(formatDue('2027-03')).toBe('mar 2027');
  });
});

describe('parseAmount', () => {
  it.each([
    ['1000', 1000],
    ['1.234,56', 1234.56],
    ['R$ 99,9', 99.9],
    ['12.5', 12.5],
    ['', NaN],
    ['abc', NaN],
  ])('reads %j as %d', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });
});
