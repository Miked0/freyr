import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createClient } from '@libsql/client';
import { createApp } from '../app';
import { DatabaseService } from './database.service';
import { AIService } from './ai.service';

const url = () => `file:${path.join(mkdtempSync(path.join(tmpdir(), 'freyr-')), 'dados.db').split(path.sep).join('/')}`;
const ai = () => new AIService({ apiKey: '', apiUrl: '', model: '' });
const MASTER = 'chave-mestra-de-teste';
const STATEMENT = 'date,amount,description\n15/03/2026,-42.50,Pix enviado - Fulano de Tal\n16/03/2026,-30.00,UBER TRIP';

async function setup(dbUrl = url()) {
  const app = createApp({ db: await DatabaseService.connect({ url: dbUrl }, { masterKey: MASTER }), ai: ai(), logRequests: false });
  const register = await request(app).post('/api/auth/register').send({ username: 'ana', password: 'senha-da-ana-1' });
  return { app, dbUrl, cookie: String(register.headers['set-cookie']), userId: register.body.user.id as string };
}

async function rawRows(dbUrl: string, sql: string) {
  const raw = createClient({ url: dbUrl });
  const rs = await raw.execute(sql);
  raw.close();
  return rs.rows.map(row => Object.fromEntries(rs.columns.map((c, i) => [c, row[i]])));
}

describe('sensitive data at rest', () => {
  it('stores descriptions and file names encrypted, and drops the raw statement line', async () => {
    const { app, dbUrl, cookie } = await setup();
    await request(app).post('/api/expenses/upload').set('Cookie', cookie).attach('statement', Buffer.from(STATEMENT), 'extrato-ana.csv');

    const stored = JSON.stringify(await rawRows(dbUrl, 'SELECT * FROM expenses'));
    expect(stored).not.toMatch(/Fulano|UBER|extrato-ana/);
    expect((await rawRows(dbUrl, 'SELECT raw_description FROM expenses')).every(r => r.raw_description === null)).toBe(true);

    const listed = await request(app).get('/api/expenses').set('Cookie', cookie);
    expect(listed.body.map((e: any) => e.description).sort()).toEqual(['Pix enviado - Fulano de Tal', 'UBER TRIP']);
  });

  it('keeps learned corrections as tokens, still applying them to new uploads', async () => {
    const { app, dbUrl, cookie } = await setup();
    const first = await request(app).post('/api/expenses/upload').set('Cookie', cookie).attach('statement', Buffer.from(STATEMENT), 'a.csv');
    const uber = first.body.expenses.find((e: any) => e.description === 'UBER TRIP');
    await request(app).put(`/api/expenses/${uber.id}`).set('Cookie', cookie).send({ category: 'Lazer', description: 'UBER TRIP ANA' });

    expect(JSON.stringify(await rawRows(dbUrl, 'SELECT * FROM category_corrections'))).not.toMatch(/UBER/);
    expect(JSON.stringify(await rawRows(dbUrl, 'SELECT * FROM expenses'))).not.toMatch(/UBER/);

    const next = await request(app).post('/api/expenses/upload').set('Cookie', cookie)
      .attach('statement', Buffer.from('date,amount,description\n20/03/2026,-25.00,UBER TRIP'), 'b.csv');
    expect(next.body.expenses[0].category).toBe('Lazer');
  });

  it('encrypts what an older version saved in plain text, and keeps reading it', async () => {
    const dbUrl = url();
    const { userId } = await setup(dbUrl);
    const raw = createClient({ url: dbUrl });
    await raw.execute({
      sql: `INSERT INTO expenses (id, user_id, date, amount, description, category, type, raw_description, source_file, import_key)
            VALUES ('velha', ?, '2026-03-15', 42.5, 'Pix recebido - Beltrano', 'Outros', 'income', 'linha crua Beltrano', 'antigo.csv', NULL)`,
      args: [userId],
    });
    await raw.execute({
      sql: "INSERT INTO category_corrections (id, user_id, description, original_category, corrected_category) VALUES ('c1', ?, 'PADARIA DO ZE', 'Outros', 'Alimentação')",
      args: [userId],
    });
    raw.close();

    const reopened = createApp({ db: await DatabaseService.connect({ url: dbUrl }, { masterKey: MASTER }), ai: ai(), logRequests: false });
    const login = await request(reopened).post('/api/auth/login').send({ username: 'ana', password: 'senha-da-ana-1' });
    const cookie = String(login.headers['set-cookie']);

    expect(JSON.stringify(await rawRows(dbUrl, 'SELECT * FROM expenses'))).not.toMatch(/Beltrano|antigo/);
    expect(JSON.stringify(await rawRows(dbUrl, 'SELECT * FROM category_corrections'))).not.toMatch(/PADARIA/);
    const listed = await request(reopened).get('/api/expenses').set('Cookie', cookie);
    expect(listed.body[0]).toMatchObject({ description: 'Pix recebido - Beltrano', source_file: 'antigo.csv' });

    const upload = await request(reopened).post('/api/expenses/upload').set('Cookie', cookie)
      .attach('statement', Buffer.from('date,amount,description\n15/03/2026,+42.50,Pix recebido - Beltrano\n16/03/2026,-9.00,PADARIA DO ZE'), 'c.csv');
    expect(upload.body.duplicates).toBe(1);
    expect(upload.body.expenses[0].category).toBe('Alimentação');
  }, 15_000);

  it('cannot read the data with another master key', async () => {
    const { app, dbUrl, cookie } = await setup();
    await request(app).post('/api/expenses/upload').set('Cookie', cookie).attach('statement', Buffer.from(STATEMENT), 'a.csv');

    const thief = createApp({ db: await DatabaseService.connect({ url: dbUrl }, { masterKey: 'outra' }), ai: ai(), logRequests: false });
    const login = await request(thief).post('/api/auth/login').send({ username: 'ana', password: 'senha-da-ana-1' });
    const res = await request(thief).get('/api/expenses').set('Cookie', String(login.headers['set-cookie']));

    expect(JSON.stringify(res.body)).not.toMatch(/Fulano|UBER/);
  });
});

describe('repeated imports with encrypted data', () => {
  it('finds the copies of an earlier upload, keeping identical purchases of one statement', async () => {
    const dbUrl = url();
    const db = await DatabaseService.connect({ url: dbUrl }, { masterKey: MASTER });
    const user = { id: await db.createUser('ana', 'hash') };
    const coffee = { date: '2026-03-15', amount: -8, description: 'CAFE DA ESQUINA', category: 'Alimentação', type: 'expense' as const };
    // One statement listing the same coffee twice, saved by an older version, then the same file sent again.
    for (const id of ['a1', 'a2', 'b1', 'b2']) await db.createExpenseForUser(user.id, { ...coffee, id, sourceFile: 'fatura-marco.csv' });
    await rawRows(dbUrl, "UPDATE expenses SET created_at = '2026-03-20 10:00:00' WHERE id IN ('a1', 'a2')");
    await rawRows(dbUrl, "UPDATE expenses SET created_at = '2026-03-25 10:00:00' WHERE id IN ('b1', 'b2')");

    const repeated = await db.getRepeatedImportsForUser(user.id);

    expect(repeated.map(e => e.id).sort()).toEqual(['b1', 'b2']);
    expect(repeated[0]).toMatchObject({ description: 'CAFE DA ESQUINA', source_file: 'fatura-marco.csv' });
    expect(repeated[0]).not.toHaveProperty('import_key');
    expect(await db.deleteRepeatedImportsForUser(user.id, ['b1', 'b2', 'a1'])).toBe(2);
  });
});

describe('deleting the account', () => {
  it('erases the user and every row of theirs after the password is confirmed', async () => {
    const { app, dbUrl, cookie } = await setup();
    await request(app).post('/api/expenses/upload').set('Cookie', cookie).attach('statement', Buffer.from(STATEMENT), 'a.csv');
    await request(app).post('/api/goals').set('Cookie', cookie).send({ name: 'Viagem', target: 1000, saved: 0, due: null });

    const res = await request(app).delete('/api/auth/account').set('Cookie', cookie).send({ password: 'senha-da-ana-1' });

    expect(res.status).toBe(200);
    expect(String(res.headers['set-cookie'])).toMatch(/freyr_session=;.*Max-Age=0/);
    for (const table of ['users', 'expenses', 'categories', 'category_corrections', 'goals']) {
      expect(await rawRows(dbUrl, `SELECT * FROM ${table}`)).toEqual([]);
    }
    expect((await request(app).get('/api/expenses').set('Cookie', cookie)).status).toBe(401);
  });

  it('keeps everything when the password is wrong', async () => {
    const { app, dbUrl, cookie } = await setup();

    const res = await request(app).delete('/api/auth/account').set('Cookie', cookie).send({ password: 'errada' });

    expect(res.status).toBe(401);
    expect(await rawRows(dbUrl, 'SELECT id FROM users')).toHaveLength(1);
  });
});
