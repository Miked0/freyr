import { create } from 'zustand';
import { api, type ExpensePatch } from '../api';
import type { Expense } from '../lib/finance';

interface ExpensesState {
  expenses: Expense[];
  categories: string[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  load: () => Promise<void>;
  update: (id: string, patch: ExpensePatch) => Promise<void>;
  remove: (ids: string[]) => Promise<void>;
  /** Makes a category just created on the server available to pick. */
  addCategory: (name: string) => void;
}

// Only the latest load may write; an older response arriving late would undo newer edits.
let latestLoad = 0;

export const useExpenses = create<ExpensesState>((set, get) => ({
  expenses: [],
  categories: [],
  status: 'idle',
  error: null,

  load: async () => {
    const request = ++latestLoad;
    set({ status: get().status === 'ready' ? 'ready' : 'loading', error: null });
    try {
      const [expenses, categories] = await Promise.all([api.listExpenses(), api.listCategories()]);
      if (request !== latestLoad) return;
      set({ expenses, categories: categories.map(c => c.name), status: 'ready' });
    } catch (err) {
      if (request !== latestLoad) return;
      // A failed reload keeps the list already on screen and only reports the error.
      set({ status: get().status === 'ready' ? 'ready' : 'error', error: (err as Error).message });
    }
  },

  update: async (id, patch) => {
    await api.updateExpense(id, patch);
    set(state => ({ expenses: state.expenses.map(e => (e.id === id ? { ...e, ...patch } : e)) }));
  },

  addCategory: name => set(state => ({ categories: [...state.categories, name] })),

  remove: async ids => {
    await Promise.all(ids.map(id => api.deleteExpense(id)));
    const removed = new Set(ids);
    set(state => ({ expenses: state.expenses.filter(e => !removed.has(e.id)) }));
  },
}));
