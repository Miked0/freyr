import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createClient } from '@libsql/client';
import { createApp } from '../app';
import { DatabaseService } from './database.service';
import { AIService } from './ai.service';

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
