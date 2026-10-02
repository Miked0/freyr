import type { Client, ResultSet } from '@libsql/client';
import { randomUUID } from 'crypto';

export const GOALS_SCHEMA = `
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target REAL NOT NULL,
  saved REAL NOT NULL DEFAULT 0,
  due TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
`;

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

const COLUMNS = 'id, name, target, saved, due';

function toGoals(rs: ResultSet): Goal[] {
  return rs.rows.map(row => ({
    id: String(row.id),
    name: String(row.name),
    target: Number(row.target),
    saved: Number(row.saved),
    due: row.due == null ? null : String(row.due),
  }));
}

export function createGoalsStore(client: Client) {
  const get = async (userId: string, id: string): Promise<Goal | undefined> =>
    toGoals(await client.execute({ sql: `SELECT ${COLUMNS} FROM goals WHERE user_id = ? AND id = ?`, args: [userId, id] }))[0];

  return {
    /** The user's goals, nearest due date first; goals without one come last. */
    async list(userId: string): Promise<Goal[]> {
      return toGoals(await client.execute({
        sql: `SELECT ${COLUMNS} FROM goals WHERE user_id = ? ORDER BY due IS NULL, due, created_at, rowid`,
        args: [userId],
      }));
    },

    async create(userId: string, input: GoalInput): Promise<Goal> {
      const goal = { id: randomUUID(), ...input };
      await client.execute({
        sql: 'INSERT INTO goals (id, user_id, name, target, saved, due) VALUES (?, ?, ?, ?, ?, ?)',
        args: [goal.id, userId, goal.name, goal.target, goal.saved, goal.due],
      });
      return goal;
    },

    /** Undefined when the user has no goal with this id. */
    async update(userId: string, id: string, patch: GoalPatch): Promise<Goal | undefined> {
      const keys = (['name', 'target', 'saved', 'due'] as const).filter(key => patch[key] !== undefined);
      if (keys.length > 0) {
        await client.execute({
          sql: `UPDATE goals SET ${keys.map(key => `${key} = ?`).join(', ')} WHERE user_id = ? AND id = ?`,
          args: [...keys.map(key => patch[key] ?? null), userId, id],
        });
      }
      return get(userId, id);
    },

    async remove(userId: string, id: string): Promise<boolean> {
      return (await client.execute({ sql: 'DELETE FROM goals WHERE user_id = ? AND id = ?', args: [userId, id] })).rowsAffected > 0;
    },
  };
}

export type GoalsStore = ReturnType<typeof createGoalsStore>;
