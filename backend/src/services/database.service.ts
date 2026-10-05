import { createClient, type Client, type InArgs, type ResultSet } from '@libsql/client';
import { SCHEMA, INDEXES, type AvatarColor } from './schema';
import { randomUUID } from 'crypto';
import { DEFAULT_CATEGORY_NAMES } from './categories';
import { importKey } from './import-key';
import { isBalanceLine } from './balance-line';
import { findRepeatedImports } from './repeated-imports';
import { GOALS_SCHEMA, createGoalsStore, type GoalsStore } from './goals';

export interface DatabaseConfig {
  url: string;
  authToken?: string;
}

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  session_version: number;
  display_name: string | null;
  avatar_color: AvatarColor;
  monthly_budget: number | null;
  created_at: string;
}

export interface Profile {
  username: string;
  display_name: string | null;
  avatar_color: AvatarColor;
  monthly_budget: number | null;
}

export type ProfileUpdate = Partial<Pick<Profile, 'display_name' | 'avatar_color' | 'monthly_budget'>>;

interface ExpenseRow {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  raw_description: string | null;
  source_file: string | null;
  import_key: string | null;
  created_at: string;
}

interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  is_custom: number;
  parent_id: string | null;
  created_at: string;
}

interface CorrectionRow {
  id: string;
  user_id: string;
  description: string;
  original_category: string;
  corrected_category: string;
  corrected_at: string;
}

function toObjects<T>(rs: ResultSet): T[] {
  return rs.rows.map(row => Object.fromEntries(rs.columns.map((column, i) => [column, row[i]]))) as T[];
}

export class DatabaseService {
  private constructor(private client: Client) {}

  get goals(): GoalsStore {
    return createGoalsStore(this.client);
  }

  static async connect(config: DatabaseConfig): Promise<DatabaseService> {
    const client = createClient({ url: config.url, authToken: config.authToken });
    await client.execute('PRAGMA foreign_keys = ON');
    await client.executeMultiple(SCHEMA);
    await DatabaseService.addLegacyOwnerColumns(client);
    await DatabaseService.addLegacyTypeColumn(client);
    await DatabaseService.addLegacySessionVersionColumn(client);
    await DatabaseService.addProfileColumns(client);
    await DatabaseService.addImportKeyColumn(client);
    await client.executeMultiple(INDEXES);
    await client.executeMultiple(GOALS_SCHEMA);
    await DatabaseService.migrateLegacyCorrections(client);
    await DatabaseService.backfillDefaultCategories(client);
    await DatabaseService.backfillImportKeys(client);
    const db = new DatabaseService(client);
    await db.removeImportedBalancesOnce();
    return db;
  }

  /**
   * Older parsers saved statement balance lines ("SALDO DO DIA", "Saldo anterior") as transactions, inflating income
   * and spending. Deletes those rows once; only rows that came from a file, matched by the same rule the parser
   * now uses to skip them. Reads through getAllExpensesForUser so it sees descriptions as the user does.
   */
  private async removeImportedBalancesOnce() {
    const task = 'remove-imported-balances-v1';
    await this.run('CREATE TABLE IF NOT EXISTS maintenance (name TEXT PRIMARY KEY, done_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
    if ((await this.all('SELECT 1 FROM maintenance WHERE name = ?', [task])).length > 0) return;
    const users = await this.all<{ user_id: string }>('SELECT DISTINCT user_id FROM expenses WHERE user_id IS NOT NULL');
    const deletes: { sql: string; args: InArgs }[] = [];
    for (const { user_id } of users) {
      for (const row of await this.getAllExpensesForUser(user_id)) {
        if (row.source_file && isBalanceLine(row.description)) {
          deletes.push({ sql: 'DELETE FROM expenses WHERE user_id = ? AND id = ?', args: [user_id, row.id] });
        }
      }
    }
    for (let i = 0; i < deletes.length; i += 200) await this.client.batch(deletes.slice(i, i + 200), 'write');
    await this.run('INSERT OR IGNORE INTO maintenance (name) VALUES (?)', [task]);
  }

  // Databases created before multi-user support have no user_id. Their rows stay ownerless
  // (NULL), so no account sees them; they are kept rather than deleted.
  private static async addLegacyOwnerColumns(client: Client) {
    for (const table of ['expenses', 'categories', 'category_corrections']) {
      const columns = await client.execute(`PRAGMA table_info(${table})`);
      if (columns.rows.some(row => row.name === 'user_id')) continue;
      await client.execute(`ALTER TABLE ${table} ADD COLUMN user_id TEXT`);
    }
  }

  // Databases created before income/expense tracking treat every row as an expense.
  private static async addLegacyTypeColumn(client: Client) {
    const columns = await client.execute('PRAGMA table_info(expenses)');
    if (columns.rows.some(row => row.name === 'type')) return;
    await client.execute(`ALTER TABLE expenses ADD COLUMN type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income','expense'))`);
  }

  private static async addLegacySessionVersionColumn(client: Client) {
    const columns = await client.execute('PRAGMA table_info(users)');
    if (columns.rows.some(row => row.name === 'session_version')) return;
    await client.execute('ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0');
  }

  private static async addImportKeyColumn(client: Client) {
    const columns = await client.execute('PRAGMA table_info(expenses)');
    if (columns.rows.some(row => row.name === 'import_key')) return;
    await client.execute('ALTER TABLE expenses ADD COLUMN import_key TEXT');
  }

  // Rows saved before duplicate detection get a key from their current values; an edited row may then
  // not match its statement line, which only lets that one line be imported again.
  private static async backfillImportKeys(client: Client) {
    const rows = toObjects<ExpenseRow>(
      await client.execute('SELECT id, date, amount, description, type FROM expenses WHERE import_key IS NULL')
    );
    if (rows.length === 0) return;
    await client.batch(
      rows.map(row => ({ sql: 'UPDATE expenses SET import_key = ? WHERE id = ?', args: [importKey(row), row.id] })),
      'write'
    );
  }

  private static async addProfileColumns(client: Client) {
    const columns = await client.execute('PRAGMA table_info(users)');
    const existing = new Set(columns.rows.map(row => row.name));
    const added: Array<[string, string]> = [
      ['display_name', 'TEXT'],
      ['avatar_color', "TEXT NOT NULL DEFAULT 'brand-primary'"],
      ['monthly_budget', 'REAL'],
    ];
    for (const [name, definition] of added) {
      if (!existing.has(name)) await client.execute(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
    }
  }

  // Accounts created before the default list grew gain the missing categories; existing names
  // (default or custom) are left alone, so running this on every start is a no-op once done.
  private static async backfillDefaultCategories(client: Client) {
    await client.batch(
      DEFAULT_CATEGORY_NAMES.map(name => ({
        sql: `INSERT INTO categories (id, user_id, name, is_custom)
              SELECT lower(hex(randomblob(16))), u.id, ?, 0 FROM users u
              WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.user_id = u.id AND lower(c.name) = lower(?))`,
        args: [name, name],
      })),
      'write'
    );
  }

  private static async migrateLegacyCorrections(client: Client) {
    const legacy = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'corrections'");
    if (legacy.rows.length === 0) return;
    await client.batch([
      `INSERT OR IGNORE INTO category_corrections (id, user_id, description, original_category, corrected_category, corrected_at)
       SELECT c.id, e.user_id, e.description, c.original_category, c.corrected_category, c.corrected_at
       FROM corrections c JOIN expenses e ON e.id = c.expense_id`,
      'DROP TABLE corrections',
    ], 'write');
  }

  private async all<T>(sql: string, args: InArgs = []): Promise<T[]> {
    return toObjects<T>(await this.client.execute({ sql, args }));
  }

  private async run(sql: string, args: InArgs = []): Promise<number> {
    return (await this.client.execute({ sql, args })).rowsAffected;
  }

  // User methods
  async createUser(username: string, passwordHash: string): Promise<string> {
    const id = randomUUID();
    await this.run(
      `INSERT INTO users (id, username, password_hash) VALUES (@id, @username, @password_hash)`,
      { id, username, password_hash: passwordHash }
    );
    return id;
  }

  async getUserByUsername(username: string): Promise<UserRow | undefined> {
    const rows = await this.all<UserRow>('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  }

  async getUserById(id: string): Promise<UserRow | undefined> {
    const rows = await this.all<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  }

  /** Invalidates every session cookie issued to the user so far. */
  async endAllSessions(userId: string): Promise<void> {
    await this.run('UPDATE users SET session_version = session_version + 1 WHERE id = ?', [userId]);
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const rows = await this.all<Profile>(
      'SELECT username, display_name, avatar_color, monthly_budget FROM users WHERE id = ?',
      [userId]
    );
    return rows[0];
  }

  /** Writes only the fields present in the update; returns the profile as stored afterwards. */
  async updateProfile(userId: string, update: ProfileUpdate): Promise<Profile | undefined> {
    const fields = (['display_name', 'avatar_color', 'monthly_budget'] as const).filter(f => f in update);
    if (fields.length > 0) {
      await this.run(
        `UPDATE users SET ${fields.map(f => `${f} = @${f}`).join(', ')} WHERE id = @id`,
        { ...Object.fromEntries(fields.map(f => [f, update[f] ?? null])), id: userId }
      );
    }
    return this.getProfile(userId);
  }

  // Category methods with user_id
  async getAllCategoriesForUser(userId: string): Promise<CategoryRow[]> {
    return this.all<CategoryRow>('SELECT * FROM categories WHERE user_id = ? ORDER BY name', [userId]);
  }

  /** Adds the default categories the user does not have yet; safe to call again. */
  async seedDefaultCategoriesForUser(userId: string): Promise<void> {
    await this.client.batch(
      DEFAULT_CATEGORY_NAMES.map(name => ({
        sql: `INSERT INTO categories (id, user_id, name, is_custom)
              SELECT ?, ?, ?, 0
              WHERE NOT EXISTS (SELECT 1 FROM categories WHERE user_id = ? AND lower(name) = lower(?))`,
        args: [randomUUID(), userId, name, userId, name],
      })),
      'write'
    );
  }

  async createCategory(userId: string, name: string, isCustom = true, parentId?: string): Promise<string> {
    const id = randomUUID();
    await this.run(
      `INSERT INTO categories (id, user_id, name, is_custom, parent_id) VALUES (@id, @user_id, @name, @is_custom, @parent_id)`,
      { id, user_id: userId, name, is_custom: isCustom ? 1 : 0, parent_id: parentId ?? null }
    );
    return id;
  }

  // Expense methods with user_id
  async getAllExpensesForUser(userId: string): Promise<ExpenseRow[]> {
    return this.all<ExpenseRow>('SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC', [userId]);
  }

  async getExpenseByIdForUser(userId: string, id: string): Promise<ExpenseRow | undefined> {
    const rows = await this.all<ExpenseRow>('SELECT * FROM expenses WHERE user_id = ? AND id = ?', [userId, id]);
    return rows[0];
  }

  async createExpenseForUser(userId: string, expense: {
      id: string;
      date: string;
      amount: number;
      description: string;
      category: string;
      type: 'income' | 'expense';
      rawDescription?: string;
      sourceFile?: string;
    }): Promise<string> {
      await this.run(
        `INSERT INTO expenses (id, user_id, date, amount, description, category, type, raw_description, source_file, import_key)
         VALUES (@id, @user_id, @date, @amount, @description, @category, @type, @raw_description, @source_file, @import_key)`,
        {
          id: expense.id,
          user_id: userId,
          date: expense.date,
          amount: expense.amount,
          description: expense.description,
          category: expense.category,
          type: expense.type,
          raw_description: expense.rawDescription ?? null,
          source_file: expense.sourceFile ?? null,
          import_key: importKey(expense),
        }
      );
      return expense.id;
    }

  async updateExpenseForUser(userId: string, id: string, updates: Record<string, string | number>): Promise<boolean> {
    const keys = Object.keys(updates);
    if (keys.length === 0) return false;
    const setClause = keys.map(key => `${key} = @${key}`).join(', ');
    return (await this.run(`UPDATE expenses SET ${setClause} WHERE user_id = @user_id AND id = @id`, { ...updates, user_id: userId, id })) > 0;
  }

  /** How many of the user's saved expenses carry each of these import keys. */
  async countImportKeysForUser(userId: string, keys: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    const unique = [...new Set(keys)];
    // Chunked to stay under SQLite's bound-parameter limit.
    for (let i = 0; i < unique.length; i += 500) {
      const chunk = unique.slice(i, i + 500);
      const rows = await this.all<{ import_key: string; n: number }>(
        `SELECT import_key, COUNT(*) AS n FROM expenses WHERE user_id = ? AND import_key IN (${chunk.map(() => '?').join(', ')})
         GROUP BY import_key`,
        [userId, ...chunk]
      );
      for (const row of rows) counts.set(row.import_key, Number(row.n));
    }
    return counts;
  }

  /** The copies of already imported transactions that uploads saved again before they skipped them. */
  async getRepeatedImportsForUser(userId: string): Promise<ExpenseRow[]> {
    const rows = await this.all<ExpenseRow>(
      'SELECT * FROM expenses WHERE user_id = ? AND source_file IS NOT NULL AND import_key IS NOT NULL ORDER BY date DESC',
      [userId]
    );
    const repeated = new Set(findRepeatedImports(rows));
    return rows.filter(row => repeated.has(row.id));
  }

  /** Deletes those of the ids that are still repeated copies; returns how many went. */
  async deleteRepeatedImportsForUser(userId: string, ids: string[]): Promise<number> {
    const requested = new Set(ids);
    const doomed = (await this.getRepeatedImportsForUser(userId)).filter(row => requested.has(row.id));
    if (doomed.length === 0) return 0;
    await this.client.batch(
      doomed.map(row => ({ sql: 'DELETE FROM expenses WHERE user_id = ? AND id = ?', args: [userId, row.id] })),
      'write'
    );
    return doomed.length;
  }

  async deleteExpenseForUser(userId: string, id: string): Promise<boolean> {
    return (await this.run('DELETE FROM expenses WHERE user_id = ? AND id = ?', [userId, id])) > 0;
  }

  // Correction methods with user_id
  async addCorrectionForUser(userId: string, correction: { id: string; description: string; original_category: string; corrected_category: string }): Promise<void> {
    await this.run(
      `INSERT INTO category_corrections (id, user_id, description, original_category, corrected_category)
       VALUES (@id, @user_id, @description, @original_category, @corrected_category)`,
      { ...correction, user_id: userId }
    );
  }

  async findCorrectedCategoryForUser(userId: string, description: string): Promise<string | undefined> {
    const rows = await this.all<CorrectionRow>(
      `SELECT corrected_category FROM category_corrections
       WHERE user_id = ? AND description = ?
       ORDER BY corrected_at DESC, rowid DESC
       LIMIT 1`,
      [userId, description]
    );
    return rows[0]?.corrected_category;
  }
}