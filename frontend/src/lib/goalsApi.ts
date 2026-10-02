import { json, request } from '../api';

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  /** Month the goal should be reached by, as YYYY-MM. */
  due: string | null;
}

export type GoalInput = Omit<Goal, 'id'>;
export type GoalPatch = Partial<GoalInput>;

export const goalsApi = {
  list: () => request<Goal[]>('/api/goals'),
  create: (input: GoalInput) => request<Goal>('/api/goals', json('POST', input)),
  update: (id: string, patch: GoalPatch) => request<Goal>(`/api/goals/${encodeURIComponent(id)}`, json('PATCH', patch)),
  remove: (id: string) => request<void>(`/api/goals/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
