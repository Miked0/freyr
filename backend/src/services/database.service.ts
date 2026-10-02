import { createClient, type Client, type InArgs, type ResultSet } from '@libsql/client';
import { SCHEMA, INDEXES, type AvatarColor } from './schema';
import { randomUUID } from 'crypto';
import { DEFAULT_CATEGORY_NAMES } from './categories';
import { importKey } from './import-key';
import { createKeyring, type Keyring, type UserKey } from './data-crypto';
import { isBalanceLine } from './balance-line';
import { findRepeatedImports } from './repeated-imports';
import { suggestRecategorizations } from './recategorize';
import { GOALS_SCHEMA, createGoalsStore, type GoalsStore } from './goals';

export interface DatabaseConfig {
  url: string;
  authToken?: string;
}

export interface DataProtectionOptions {
  /** Seals each user's data key (DATA_ENCRYPTION_KEY); the fallback is for local development and tests only. */
  masterKey?: string;
}

const DEV_MASTER_KEY = 'freyr-dev-master-key';

/** Stored as the password hash of accounts created through Google: not a bcrypt hash, so no password matches it. */
export const NO_PASSWORD = '!';

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  session_version: number;
  display_name: string | null;
  avatar_color: AvatarColor;
  monthly_budget: number | null;
  data_key: string | null;
  google_sub: string | null;
  email: string | null;
  created_at: string;
}

export interface Profile {
  username: string;
  display_name: string | null;
  avatar_color: AvatarColor;
  monthly_budget: number | null;
  /** How much the user said they had invested, and on which day ("YYYY-MM-DD"). */
  invested_balance: number | null;
  invested_balance_on: string | null;
  /** Whether the account can be opened with "Entrar com Google". */
  google_linked: boolean;
  /** False for accounts created through Google, which only open with Google. */
  has_password: boolean;
}

export type ProfileUpdate = Partial<Pick<Profile, 'display_name' | 'avatar_color' | 'monthly_budget' | 'invested_balance'>>;

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
  private keys = new Map<string, UserKey>();

  private constructor(private client: Client, private keyring: Keyring) {}

  get goals(): GoalsStore {
    return createGoalsStore(this.client);
  }

  static async connect(config: DatabaseConfig, { masterKey = DEV_MASTER_KEY }: DataProtectionOptions = {}): Promise<DatabaseService> {
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
    const db = new DatabaseService(client, createKeyring(masterKey));
    await db.protectPlainRows();
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
      ['data_key', 'TEXT'],
      ['invested_balance', 'REAL'],
      ['invested_balance_on', 'TEXT'],
      ['google_sub', 'TEXT'],
      ['email', 'TEXT'],
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

  /** The user's data key, created on first use for accounts that predate encryption. */
  private async userKey(userId: string): Promise<UserKey> {
    const cached = this.keys.get(userId);
    if (cached) return cached;
    // Only fills an empty slot, so two requests racing on a legacy account settle on the same key.
    await this.run('UPDATE users SET data_key = ? WHERE id = ? AND data_key IS NULL', [this.keyring.newWrappedKey(), userId]);
    const rows = await this.all<{ data_key: string | null }>('SELECT data_key FROM users WHERE id = ?', [userId]);
    if (!rows[0]?.data_key) throw new Error('Usuário sem chave de dados.');
    const key = this.keyring.unwrap(rows[0].data_key);
    this.keys.set(userId, key);
    return key;
  }

  private openExpense(key: UserKey, row: ExpenseRow): ExpenseRow {
    const { import_key: _key, raw_description: _raw, ...rest } = row;
    const open = (value: string | null) => (value && this.keyring.isSealed(value) ? key.decrypt(value) : value);
    return { ...rest, description: open(row.description)!, source_file: open(row.source_file) } as ExpenseRow;
  }

  /**
   * Seals what older versions saved in plain text: descriptions and file names are encrypted, lookup keys
   * and corrections become tokens, and the raw statement line is dropped. Ownerless legacy rows stay as
   * they are, since no account can read them.
   */
  private async protectPlainRows() {
    const expenses = await this.all<ExpenseRow>(
      `SELECT id, user_id, description, source_file, import_key, raw_description FROM expenses
       WHERE user_id IS NOT NULL AND (description NOT LIKE 'v1:%' OR raw_description IS NOT NULL
         OR (source_file IS NOT NULL AND source_file NOT LIKE 'v1:%') OR (import_key IS NOT NULL AND import_key NOT LIKE 't1:%'))`
    );
    const corrections = await this.all<CorrectionRow>(
      "SELECT id, user_id, description FROM category_corrections WHERE user_id IS NOT NULL AND description NOT LIKE 't1:%'"
    );
    const updates: { sql: string; args: InArgs }[] = [];
    for (const row of expenses) {
      const key = await this.userKey(row.user_id);
      const seal = (value: string | null) => (value === null || this.keyring.isSealed(value) ? value : key.encrypt(value));
      const tokenize = (value: string | null) => (value === null || this.keyring.isToken(value) ? value : key.token(value));
      updates.push({
        sql: 'UPDATE expenses SET description = ?, source_file = ?, import_key = ?, raw_description = NULL WHERE id = ?',
        args: [seal(row.description), seal(row.source_file), tokenize(row.import_key), row.id],
      });
    }
    for (const row of corrections) {
      const key = await this.userKey(row.user_id);
      updates.push({ sql: 'UPDATE category_corrections SET description = ? WHERE id = ?', args: [key.token(row.description), row.id] });
    }
    for (let i = 0; i < updates.length; i += 200) await this.client.batch(updates.slice(i, i + 200), 'write');
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
      `INSERT INTO users (id, username, password_hash, data_key) VALUES (@id, @username, @password_hash, @data_key)`,
      { id, username, password_hash: passwordHash, data_key: this.keyring.newWrappedKey() }
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

  /** Erases the account and everything it owns; its data key goes with it. */
  async deleteUser(userId: string): Promise<void> {
    // Explicit deletes: the foreign-key cascade depends on a per-connection pragma.
    await this.client.batch(
      ['goals', 'category_corrections', 'categories', 'expenses'].map(table => ({
        sql: `DELETE FROM ${table} WHERE user_id = ?`,
        args: [userId],
      })).concat([{ sql: 'DELETE FROM users WHERE id = ?', args: [userId] }]),
      'write'
    );
    this.keys.delete(userId);
  }

  async getUserByGoogleSub(googleSub: string): Promise<UserRow | undefined> {
    const rows = await this.all<UserRow>('SELECT * FROM users WHERE google_sub = ?', [googleSub]);
    return rows[0];
  }

  /** Lets the user log in with this Google account; false if the user already has another one linked. */
  async linkGoogleAccount(userId: string, googleSub: string, email: string): Promise<boolean> {
    return (await this.run(
      'UPDATE users SET google_sub = ?, email = ? WHERE id = ? AND (google_sub IS NULL OR google_sub = ?)',
      [googleSub, email, userId, googleSub]
    )) > 0;
  }

  /** Invalidates every session cookie issued to the user so far. */
  async endAllSessions(userId: string): Promise<void> {
    await this.run('UPDATE users SET session_version = session_version + 1 WHERE id = ?', [userId]);
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const rows = await this.all<Omit<Profile, 'google_linked' | 'has_password'> & { google_sub: string | null; password_hash: string }>(
      'SELECT username, display_name, avatar_color, monthly_budget, invested_balance, invested_balance_on, google_sub, password_hash FROM users WHERE id = ?',
      [userId]
    );
    if (!rows[0]) return undefined;
    const { google_sub, password_hash, ...profile } = rows[0];
    return { ...profile, google_linked: google_sub !== null, has_password: password_hash !== NO_PASSWORD };
  }

  /** Writes only the fields present in the update; returns the profile as stored afterwards. */
  async updateProfile(userId: string, update: ProfileUpdate): Promise<Profile | undefined> {
    const fields = (['display_name', 'avatar_color', 'monthly_budget', 'invested_balance'] as const).filter(f => f in update);
    if (fields.length > 0) {
      // The invested balance is what the user had on the day they typed it; later moves are added to it.
      const dated = 'invested_balance' in update
        ? `, invested_balance_on = ${update.invested_balance == null ? 'NULL' : "date('now')"}`
        : '';
      await this.run(
        `UPDATE users SET ${fields.map(f => `${f} = @${f}`).join(', ')}${dated} WHERE id = @id`,
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
    const rows = await this.all<ExpenseRow>('SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC', [userId]);
    if (rows.length === 0) return rows;
    const key = await this.userKey(userId);
    return rows.map(row => this.openExpense(key, row));
  }

  async getExpenseByIdForUser(userId: string, id: string): Promise<ExpenseRow | undefined> {
    const rows = await this.all<ExpenseRow>('SELECT * FROM expenses WHERE user_id = ? AND id = ?', [userId, id]);
    return rows[0] && this.openExpense(await this.userKey(userId), rows[0]);
  }

  async createExpenseForUser(userId: string, expense: {
      id: string;
      date: string;
      amount: number;
      description: string;
      category: string;
      type: 'income' | 'expense';
      sourceFile?: string;
    }): Promise<string> {
      const key = await this.userKey(userId);
      await this.run(
        `INSERT INTO expenses (id, user_id, date, amount, description, category, type, source_file, import_key)
         VALUES (@id, @user_id, @date, @amount, @description, @category, @type, @source_file, @import_key)`,
        {
          id: expense.id,
          user_id: userId,
          date: expense.date,
          amount: expense.amount,
          description: key.encrypt(expense.description),
          category: expense.category,
          type: expense.type,
          source_file: expense.sourceFile ? key.encrypt(expense.sourceFile) : null,
          import_key: key.token(importKey(expense)),
        }
      );
      return expense.id;
    }

  async updateExpenseForUser(userId: string, id: string, updates: Record<string, string | number>): Promise<boolean> {
    const keys = Object.keys(updates);
    if (keys.length === 0) return false;
    const values = { ...updates };
    if (typeof values.description === 'string') values.description = (await this.userKey(userId)).encrypt(values.description);
    const setClause = keys.map(key => `${key} = @${key}`).join(', ');
    return (await this.run(`UPDATE expenses SET ${setClause} WHERE user_id = @user_id AND id = @id`, { ...values, user_id: userId, id })) > 0;
  }

  /** How many of the user's saved expenses carry each of these import keys. */
  async countImportKeysForUser(userId: string, keys: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    const key = await this.userKey(userId);
    const plainByToken = new Map([...new Set(keys)].map(k => [key.token(k), k]));
    const unique = [...plainByToken.keys()];
    // Chunked to stay under SQLite's bound-parameter limit.
    for (let i = 0; i < unique.length; i += 500) {
      const chunk = unique.slice(i, i + 500);
      const rows = await this.all<{ import_key: string; n: number }>(
        `SELECT import_key, COUNT(*) AS n FROM expenses WHERE user_id = ? AND import_key IN (${chunk.map(() => '?').join(', ')})
         GROUP BY import_key`,
        [userId, ...chunk]
      );
      for (const row of rows) counts.set(plainByToken.get(row.import_key)!, Number(row.n));
    }
    return counts;
  }

  /** The copies of already imported transactions that uploads saved again before they skipped them. */
  async getRepeatedImportsForUser(userId: string): Promise<ExpenseRow[]> {
    const rows = await this.all<ExpenseRow>(
      'SELECT * FROM expenses WHERE user_id = ? AND source_file IS NOT NULL AND import_key IS NOT NULL ORDER BY date DESC',
      [userId]
    );
    const key = await this.userKey(userId);
    // Each file name is sealed with its own nonce, so they are compared opened.
    const opened = rows.map(row => ({ row, source_file: this.openExpense(key, row).source_file }));
    const repeated = new Set(findRepeatedImports(opened.map(({ row, source_file }) => ({ ...row, source_file }))));
    return rows.filter(row => repeated.has(row.id)).map(row => this.openExpense(key, row));
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

  /** The files the user imported, with how many of their transactions are still saved. */
  async getImportedFilesForUser(userId: string): Promise<{ name: string; transactions: number }[]> {
    const rows = await this.all<ExpenseRow>('SELECT * FROM expenses WHERE user_id = ? AND source_file IS NOT NULL', [userId]);
    const key = await this.userKey(userId);
    // Each file name is sealed with its own nonce, so they are counted opened.
    const counts = new Map<string, number>();
    for (const row of rows) {
      const name = this.openExpense(key, row).source_file!;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts].map(([name, transactions]) => ({ name, transactions })).sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Deletes every transaction that came from an imported file; returns how many went. */
  async deleteImportedExpensesForUser(userId: string): Promise<number> {
    return this.run('DELETE FROM expenses WHERE user_id = ? AND source_file IS NOT NULL', [userId]);
  }

  /** Entries whose category the current rules would set differently; see suggestRecategorizations. */
  async getRecategorizationsForUser(userId: string) {
    const expenses = await this.getAllExpensesForUser(userId);
    const categories = (await this.getAllCategoriesForUser(userId)).map(c => c.name);
    const byId = new Map(expenses.map(e => [e.id, e]));
    const candidates = suggestRecategorizations(expenses, categories, new Set());
    const corrected = new Set<string>();
    for (const description of new Set(candidates.map(c => byId.get(c.id)!.description))) {
      if ((await this.findCorrectedCategoryForUser(userId, description)) !== undefined) corrected.add(description);
    }
    return candidates
      .filter(c => !corrected.has(byId.get(c.id)!.description))
      .map(c => ({ ...byId.get(c.id)!, from: c.from, to: c.to }));
  }

  /** Applies those of the ids that still have a suggested category; returns how many changed. */
  async applyRecategorizationsForUser(userId: string, ids: string[]): Promise<number> {
    const requested = new Set(ids);
    const chosen = (await this.getRecategorizationsForUser(userId)).filter(s => requested.has(s.id));
    if (chosen.length === 0) return 0;
    await this.client.batch(
      chosen.map(s => ({ sql: 'UPDATE expenses SET category = ? WHERE user_id = ? AND id = ?', args: [s.to, userId, s.id] })),
      'write'
    );
    return chosen.length;
  }

  async deleteExpenseForUser(userId: string, id: string): Promise<boolean> {
    return (await this.run('DELETE FROM expenses WHERE user_id = ? AND id = ?', [userId, id])) > 0;
  }

  // Correction methods with user_id
  async addCorrectionForUser(userId: string, correction: { id: string; description: string; original_category: string; corrected_category: string }): Promise<void> {
    await this.run(
      `INSERT INTO category_corrections (id, user_id, description, original_category, corrected_category)
       VALUES (@id, @user_id, @description, @original_category, @corrected_category)`,
      { ...correction, description: (await this.userKey(userId)).token(correction.description), user_id: userId }
    );
  }

  async findCorrectedCategoryForUser(userId: string, description: string): Promise<string | undefined> {
    const rows = await this.all<CorrectionRow>(
      `SELECT corrected_category FROM category_corrections
       WHERE user_id = ? AND description = ?
       ORDER BY corrected_at DESC, rowid DESC
       LIMIT 1`,
      [userId, (await this.userKey(userId)).token(description)]
    );
    return rows[0]?.corrected_category;
  }
}