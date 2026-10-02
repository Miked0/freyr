import type { Expense } from './lib/finance';

// Same origin in production (Vercel) and via the Vite proxy in development.
export const API_URL = import.meta.env.VITE_API_URL ?? '';

export interface Category {
  id: string;
  name: string;
  is_custom: number;
  parent_id: string | null;
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
}

export type ProfilePatch = Partial<Pick<Profile, 'display_name' | 'avatar_color' | 'monthly_budget'>>;

export type ExpensePatch = Partial<Pick<Expense, 'description' | 'amount' | 'category' | 'type'>>;

export class UnauthorizedError extends Error {}

let unauthorizedHandler: (() => void) | undefined;

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
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
  getProfile: () => request<Profile>('/api/auth/profile'),
  updateProfile: (patch: ProfilePatch) => request<Profile>('/api/auth/profile', json('PATCH', patch)),
  listExpenses: () => request<Expense[]>('/api/expenses'),
  listCategories: () => request<Category[]>('/api/expenses/categories/all'),
  updateExpense: (id: string, patch: ExpensePatch) => request<void>(`/api/expenses/${id}`, json('PUT', patch)),
  deleteExpense: (id: string) => request<void>(`/api/expenses/${id}`, { method: 'DELETE' }),
  uploadStatement: (file: File) => {
    const form = new FormData();
    form.append('statement', file);
    return request<UploadResponse>('/api/expenses/upload', { method: 'POST', body: form });
  },
  health: () => request<Health>('/api/health'),
};