import type { Expense } from './lib/finance';

// Same origin in production (Vercel) and via the Vite proxy in development.
export const API_URL = import.meta.env.VITE_API_URL ?? '';

export interface Category {
  id: string;
  name: string;
  is_custom: number;
  parent_id: string | null;
}

/** A category as /api/categories lists it; custom ones are those the user created. */
export interface AccountCategory {
  id: string;
  name: string;
  is_custom: boolean;
}

export interface CategoryCatalog {
  categories: AccountCategory[];
  /** How many custom categories the account may have. */
  custom_limit: number;
}

export interface User {
  id: string;
  username: string;
}

export interface UploadResponse {
  message: string;
  expenses: Expense[];
  /** Transactions skipped because they were already saved. */
  duplicates?: number;
}

export interface Health {
  status: string;
  ai: 'nvidia' | 'keywords';
}

export interface Session {
  authenticated: boolean;
  user: User | null;
}

export interface Profile {
  username: string;
  display_name: string | null;
  avatar_color: 'brand-primary' | 'frost' | 'brand-warm' | 'positive' | 'alert' | 'hero';
  monthly_budget: number | null;
  /** How much the user said they had invested, and on which day ("YYYY-MM-DD"). */
  invested_balance: number | null;
  invested_balance_on: string | null;
}

export interface ImportedFile {
  name: string;
  /** How many of the file's transactions are still saved. */
  transactions: number;
}

export type ProfilePatch = Partial<Pick<Profile, 'display_name' | 'avatar_color' | 'monthly_budget' | 'invested_balance'>>;

/** An entry whose saved category the current rules would set differently. */
export type Recategorization = Expense & { from: string; to: string };

export type ExpensePatch = Partial<Pick<Expense, 'description' | 'amount' | 'category' | 'type'>>;

export class UnauthorizedError extends Error {}

let unauthorizedHandler: (() => void) | undefined;

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

/** Sends the app back to the sign-in screen, e.g. after the account is deleted. */
export function endSession() {
  unauthorizedHandler?.();
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { credentials: 'same-origin', ...init });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
  }
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) {
    if (!path.startsWith('/api/auth/')) unauthorizedHandler?.();
    throw new UnauthorizedError(body.error || 'Faça login para continuar.');
  }
  if (!response.ok) {
    throw new Error(body.error || `Erro ${response.status} ao falar com o servidor`);
  }
  return body as T;
}

export const json = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

export const api = {
  session: () => request<Session>('/api/auth/session'),
  login: (username: string, password: string) => request<{ authenticated: boolean; user: User }>('/api/auth/login', json('POST', { username, password })),
  register: (username: string, password: string) => request<{ authenticated: boolean; user: User }>('/api/auth/register', json('POST', { username, password })),
  logout: () => request<{ authenticated: boolean }>('/api/auth/logout', { method: 'POST' }),
  deleteAccount: (password: string) => request<{ deleted: boolean }>('/api/auth/account', json('DELETE', { password })),
  getProfile: () => request<Profile>('/api/auth/profile'),
  updateProfile: (patch: ProfilePatch) => request<Profile>('/api/auth/profile', json('PATCH', patch)),
  listExpenses: () => request<Expense[]>('/api/expenses'),
  listRecategorizations: () => request<{ suggestions: Recategorization[] }>('/api/expenses/recategorize'),
  applyRecategorizations: (ids: string[]) => request<{ updated: number }>('/api/expenses/recategorize', json('POST', { ids })),
  listCategories: () => request<Category[]>('/api/expenses/categories/all'),
  getCategoryCatalog: () => request<CategoryCatalog>('/api/categories'),
  createCategory: (name: string) => request<AccountCategory>('/api/categories', json('POST', { name })),
  deleteCategory: (id: string) => request<{ message: string }>(`/api/categories/${id}`, { method: 'DELETE' }),
  updateExpense: (id: string, patch: ExpensePatch) => request<void>(`/api/expenses/${id}`, json('PUT', patch)),
  deleteExpense: (id: string) => request<void>(`/api/expenses/${id}`, { method: 'DELETE' }),
  listRepeatedImports: () => request<{ expenses: Expense[] }>('/api/expenses/repeated'),
  removeRepeatedImports: (ids: string[]) => request<{ removed: number }>('/api/expenses/repeated/remove', json('POST', { ids })),
  listImportedFiles: () => request<{ files: ImportedFile[] }>('/api/expenses/imports'),
  clearImportHistory: () => request<{ removed: number }>('/api/expenses/imports', { method: 'DELETE' }),
  uploadStatement: (file: File) => {
    const form = new FormData();
    form.append('statement', file);
    return request<UploadResponse>('/api/expenses/upload', { method: 'POST', body: form });
  },
  health: () => request<Health>('/api/health'),
};