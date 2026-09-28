import { createClient, type Client, type InArgs, type ResultSet } from '@libsql/client';
import { SCHEMA } from './schema';

export interface DatabaseConfig {
  url: string;
  authToken?: string;
}

function toObjects(rs: ResultSet): any[] {
  return rs.rows.map(row => Object.fromEntries(rs.columns.map((column, i) => [column, row[i]])));
}

export class DatabaseService {
  private constructor(private client: Client) {}

  static async connect(config: DatabaseConfig): Promise<DatabaseService> {
    const client = createClient({ url: config.url, authToken: config.authToken });
    await client.execute('PRAGMA foreign_keys = ON');
    await client.executeMultiple(SCHEMA);
    await DatabaseService.migrateLegacyCorrections(client);
    return new DatabaseService(client);
  }

  // Older databases stored corrections keyed by expense (with a foreign key), which broke
  // deletes and lost the learning once the expense was gone.
  private static async migrateLegacyCorrections(client: Client) {
    const legacy = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'corrections'");
    if (legacy.rows.length === 0) return;
    await client.batch([
      `INSERT OR IGNORE INTO category_corrections (id, description, original_category, corrected_category, corrected_at)
       SELECT c.id, e.description, c.original_category, c.corrected_category, c.corrected_at
       FROM corrections c JOIN expenses e ON e.id = c.expense_id`,
      'DROP TABLE corrections',
    ], 'write');
  }

  private async all(sql: string, args: InArgs = []): Promise<any[]> {
    return toObjects(await this.client.execute({ sql, args }));
  }

  private async run(sql: string, args: InArgs = []): Promise<number> {
    return (await this.client.execute({ sql, args })).rowsAffected;
  }

  async getAllExpenses(): Promise<any[]> {
    return this.all('SELECT * FROM expenses ORDER BY date DESC');
  }

  async getExpenseById(id: string): Promise<any> {
    return (await this.all('SELECT * FROM expenses WHERE id = ?', [id]))[0];
  }

  async createExpense(expense: any): Promise<string> {
    await this.run(
      `INSERT INTO expenses (id, date, amount, description, category, raw_description, source_file)
       VALUES (@id, @date, @amount, @description, @category, @raw_description, @source_file)`,
      {
        id: expense.id,
        date: expense.date,
        amount: expense.amount,
        description: expense.description,
        category: expense.category,
        raw_description: expense.rawDescription ?? null,
        source_file: expense.sourceFile ?? null,
      }
    );
    return expense.id;
  }

  async updateExpense(id: string, updates: Record<string, string | number>): Promise<boolean> {
    const keys = Object.keys(updates);
    if (keys.length === 0) return false;
    const setClause = keys.map(key => `${key} = @${key}`).join(', ');
    return (await this.run(`UPDATE expenses SET ${setClause} WHERE id = @id`, { ...updates, id })) > 0;
  }

  async deleteExpense(id: string): Promise<boolean> {
    return (await this.run('DELETE FROM expenses WHERE id = ?', [id])) > 0;
  }

  async getAllCategories(): Promise<any[]> {
    return this.all('SELECT * FROM categories ORDER BY name');
  }

  async addCorrection(correction: { id: string; description: string; original_category: string; corrected_category: string }): Promise<void> {
    await this.run(
      `INSERT INTO category_corrections (id, description, original_category, corrected_category)
       VALUES (@id, @description, @original_category, @corrected_category)`,
      correction
    );
  }

  async findCorrectedCategory(description: string): Promise<string | undefined> {
    const rows = await this.all(
      `SELECT corrected_category FROM category_corrections
       WHERE description = ?
       ORDER BY corrected_at DESC, rowid DESC
       LIMIT 1`,
      [description]
    );
    return rows[0]?.corrected_category;
  }
}
