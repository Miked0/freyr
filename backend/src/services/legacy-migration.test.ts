import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createClient } from '@libsql/client';
import { createApp } from '../app';
import { DatabaseService } from './database.service';
import { AIService } from './ai.service';
import { DEFAULT_CATEGORY_NAMES } from './categories';
import { SCHEMA } from './schema';

// Schema as shipped before multi-user support: no users, no user_id columns.
const LEGACY_SCHEMA = `
CREATE TABLE expenses (id TEXT PRIMARY KEY, date TEXT NOT NULL, amount REAL NOT NULL, description TEXT NOT NULL,
  category TEXT NOT NULL, raw_description TEXT, source_file TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, is_custom BOOLEAN DEFAULT 0, parent_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE category_corrections (id TEXT PRIMARY KEY, description TEXT NOT NULL, original_category TEXT NOT NULL,
  corrected_category TEXT NOT NULL, corrected_at DATETIME DEFAULT CURRENT_TIMESTAMP);
INSERT INTO categories (id, name, is_custom) VALUES ('cat_food', 'Alimentação', 0), ('cat_other', 'Outros', 0);
INSERT INTO expenses (id, date, amount, description, category) VALUES ('e1', '2026-03-15', 42.5, 'UBER TRIP', 'Transporte');
INSERT INTO category_corrections (id, description, original_category, corrected_category)
  VALUES ('c1', 'PADARIA', 'Outros', 'Alimentação');
`;

const url = () => `file:${path.join(mkdtempSync(path.join(tmpdir(), 'freyr-')), 'legacy.db').split(path.sep).join('/')}`;

describe('legacy database migration', () => {
  it('opens a pre-multi-user database and starts every new account empty, even the first one', async () => {
    const dbUrl = url();
    const raw = createClient({ url: dbUrl });
    await raw.executeMultiple(LEGACY_SCHEMA);
    raw.close();

    const app = createApp({
      db: await DatabaseService.connect({ url: dbUrl }),
      ai: new AIService({ apiKey: '', apiUrl: '', model: '' }),
      logRequests: false,
    });

    const first = await request(app).post('/api/auth/register').send({ username: 'dono', password: 'senha-do-dono-1' });
    const cookie = String(first.headers['set-cookie']);

    const expenses = await request(app).get('/api/expenses').set('Cookie', cookie);
    expect(expenses.body).toEqual([]);

    const categories = (await request(app).get('/api/expenses/categories/all').set('Cookie', cookie)).body.map((c: any) => c.name);
    expect(categories.filter((n: string) => n === 'Alimentação')).toHaveLength(1);
  }, 15_000);

  it('accepts uploads on a multi-user database created before income/expense types existed', async () => {
    const dbUrl = url();
    const raw = createClient({ url: dbUrl });
    await raw.executeMultiple(PRE_TYPE_SCHEMA);
    raw.close();

    const app = createApp({
      db: await DatabaseService.connect({ url: dbUrl }),
      ai: new AIService({ apiKey: '', apiUrl: '', model: '' }),
      logRequests: false,
    });
    const cookie = String((await request(app).post('/api/auth/register').send({ username: 'dono', password: 'senha-do-dono-1' })).headers['set-cookie']);

    const upload = await request(app)
      .post('/api/expenses/upload')
      .set('Cookie', cookie)
      .attach('statement', Buffer.from('date,amount,description\n15/03/2026,+3000.00,SALARIO'), 'extrato.csv');
    expect(upload.status).toBe(200);

    const expenses = await request(app).get('/api/expenses').set('Cookie', cookie);
    expect(expenses.body.map((e: any) => [e.description, e.type])).toEqual([['SALARIO', 'income']]);
  }, 15_000);
});

// Schema as shipped with multi-user support, before the income/expense type column.
const PRE_TYPE_SCHEMA = `
CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE expenses (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL, amount REAL NOT NULL,
  description TEXT NOT NULL, category TEXT NOT NULL, raw_description TEXT, source_file TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
`;

describe('default category backfill', () => {
  const OLD_DEFAULTS = [
    'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Compras', 'Contas', 'Educação',
    'Salário', 'Investimentos', 'Transferências', 'Outros',
  ];

  it('gives existing accounts the new default categories once, keeping their own', async () => {
    const dbUrl = url();
    await DatabaseService.connect({ url: dbUrl });
    const raw = createClient({ url: dbUrl });
    await raw.execute("INSERT INTO users (id, username, password_hash) VALUES ('u1', 'antigo', 'x')");
    for (const name of OLD_DEFAULTS) {
      await raw.execute({ sql: "INSERT INTO categories (id, user_id, name, is_custom) VALUES (?, 'u1', ?, 0)", args: [`old-${name}`, name] });
    }
    await raw.execute("INSERT INTO categories (id, user_id, name, is_custom) VALUES ('mine', 'u1', 'Pets', 1)");
    raw.close();

    await DatabaseService.connect({ url: dbUrl });
    const db = await DatabaseService.connect({ url: dbUrl });

    const categories = await db.getAllCategoriesForUser('u1');
    const names = categories.map(c => c.name);
    expect([...names].sort()).toEqual([...DEFAULT_CATEGORY_NAMES].sort());
    expect(categories.find(c => c.name === 'Alimentação')?.id).toBe('old-Alimentação');
    expect(categories.find(c => c.name === 'Pets')).toMatchObject({ id: 'mine', is_custom: 1 });
  }, 15_000);

  it('seeds a new account with every default category, and seeding again adds nothing', async () => {
    const db = await DatabaseService.connect({ url: ':memory:' });
    const userId = await db.createUser('nova', 'x');

    await db.seedDefaultCategoriesForUser(userId);
    await db.seedDefaultCategoriesForUser(userId);

    expect((await db.getAllCategoriesForUser(userId)).map(c => c.name).sort()).toEqual([...DEFAULT_CATEGORY_NAMES].sort());
  });
});

describe('import key backfill', () => {
  it('recognizes a re-upload of transactions saved before duplicate detection existed', async () => {
    const dbUrl = url();
    const raw = createClient({ url: dbUrl });
    await raw.executeMultiple(PRE_TYPE_SCHEMA);
    raw.close();
    const app = createApp({
      db: await DatabaseService.connect({ url: dbUrl }),
      ai: new AIService({ apiKey: '', apiUrl: '', model: '' }),
      logRequests: false,
    });
    const register = await request(app).post('/api/auth/register').send({ username: 'dono', password: 'senha-do-dono-1' });
    const cookie = String(register.headers['set-cookie']);
    const userId = register.body.user.id;

    // A row saved by an older version, without an import key.
    const old = createClient({ url: dbUrl });
    await old.execute({
      sql: "INSERT INTO expenses (id, user_id, date, amount, description, category, type) VALUES ('e1', ?, '2026-03-15', 42.5, 'UBER TRIP', 'Transporte', 'expense')",
      args: [userId],
    });
    await old.execute("UPDATE expenses SET import_key = NULL WHERE id = 'e1'");
    old.close();

    const reopened = createApp({
      db: await DatabaseService.connect({ url: dbUrl }),
      ai: new AIService({ apiKey: '', apiUrl: '', model: '' }),
      logRequests: false,
    });
    const res = await request(reopened)
      .post('/api/expenses/upload')
      .set('Cookie', cookie)
      .attach('statement', Buffer.from('date,amount,description\n15/03/2026,-42.50,UBER TRIP'), 'extrato.csv');

    expect(res.body.duplicates).toBe(1);
  }, 15_000);
});

describe('limpeza de linhas de saldo já importadas', () => {
  it('apaga uma vez as linhas de saldo que versões antigas gravaram como transação, e só elas', async () => {
    const dbUrl = url();
    const old = createClient({ url: dbUrl });
    await old.executeMultiple(SCHEMA);
    await old.execute("INSERT INTO users (id, username, password_hash) VALUES ('u1', 'dono', 'x')");
    // Rows an older parser saved from statements, balances included; a row that came from no file stays.
    const rows: [string, number, string, 'income' | 'expense', string | null][] = [
      ['s1', 200, 'SALDO ANTERIOR', 'income', 'extrato.pdf'],
      ['s2', 150, 'SALDO DO DIA', 'income', 'extrato.pdf'],
      ['s3', 150, 'S A L D O', 'expense', 'extrato.csv'],
      ['t1', 50, 'PIX ENVIADO FULANO', 'expense', 'extrato.pdf'],
      ['t2', 300, 'Pix recebido - Saldanha', 'income', 'extrato.pdf'],
      ['m1', 80, 'Saldo', 'expense', null],
    ];
    const insert = (id: string, amount: number, description: string, type: string, sourceFile: string | null) =>
      old.execute({
        sql: "INSERT INTO expenses (id, user_id, date, amount, description, category, type, source_file) VALUES (?, 'u1', '2026-09-01', ?, ?, 'Outros', ?, ?)",
        args: [id, amount, description, type, sourceFile],
      });
    for (const row of rows) await insert(...row);

    await DatabaseService.connect({ url: dbUrl });
    const ids = async () => (await old.execute('SELECT id FROM expenses ORDER BY id')).rows.map(r => r.id);
    expect(await ids()).toEqual(['m1', 't1', 't2']);

    // Once done, a later start leaves the data alone: from here on the parser never saves a balance.
    await insert('s4', 10, 'SALDO FINAL', 'income', 'extrato.pdf');
    await DatabaseService.connect({ url: dbUrl });
    expect(await ids()).toEqual(['m1', 's4', 't1', 't2']);
    old.close();
  });
});
