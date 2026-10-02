import { create } from 'zustand';
import { goalsApi, type Goal, type GoalInput, type GoalPatch } from '@/lib/goalsApi';

interface GoalsState {
  goals: Goal[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  load: () => Promise<void>;
  create: (input: GoalInput) => Promise<void>;
  update: (id: string, patch: GoalPatch) => Promise<void>;
  /** Adds amount to what the goal has saved so far. */
  deposit: (id: string, amount: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/** Nearest due month first; goals without a due date keep their order at the end. */
export function sortByDue(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    if (a.due === b.due) return 0;
    if (a.due === null) return 1;
    if (b.due === null) return -1;
    return a.due < b.due ? -1 : 1;
  });
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-12" → "dez 2026". */
export function formatDue(month: string): string {
  const [year, m] = month.split('-');
  return `${MONTHS[Number(m) - 1]} ${year}`;
}

/** Reads "1.234,56", "R$ 99,9" or "12.5" as a number; NaN when it is not an amount. */
export function parseAmount(text: string): number {
  let s = text.replace(/R\$|\s/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

const cents = (value: number) => Math.round(value * 100) / 100;

export const useGoals = create<GoalsState>((set, get) => {
  const replace = (saved: Goal) => set(state => ({ goals: sortByDue(state.goals.map(g => (g.id === saved.id ? saved : g))) }));

  return {
    goals: [],
    status: 'idle',
    error: null,

    load: async () => {
      set({ status: get().status === 'ready' ? 'ready' : 'loading', error: null });
      try {
        set({ goals: sortByDue(await goalsApi.list()), status: 'ready' });
      } catch (err) {
        set({ status: get().status === 'ready' ? 'ready' : 'error', error: (err as Error).message });
      }
    },

    create: async input => {
      const goal = await goalsApi.create(input);
      set(state => ({ goals: sortByDue([...state.goals, goal]) }));
    },

    update: async (id, patch) => replace(await goalsApi.update(id, patch)),

    deposit: async (id, amount) => {
      const goal = get().goals.find(g => g.id === id);
      if (!goal) return;
      replace(await goalsApi.update(id, { saved: cents(goal.saved + amount) }));
    },

    remove: async id => {
      await goalsApi.remove(id);
      set(state => ({ goals: state.goals.filter(g => g.id !== id) }));
    },
  };
});
