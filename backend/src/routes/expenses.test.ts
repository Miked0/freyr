import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { DatabaseService } from '../services/database.service';
import { AIService } from '../services/ai.service';
import { randomUUID } from 'crypto';
import type { Client } from '@libsql/client';

const offlineAI = () => new AIService({ apiKey: '', apiUrl: '', model: '' });

const csv = (rows: string[]) => Buffer.from(['date,amount,description', ...rows].join('\n'));

describe('/api/expenses', () => {
  let app: ReturnType<typeof createApp>;
  let cookie: string;

  beforeEach(async () => {
    app = createApp({ db: await DatabaseService.connect({ url: ':memory:' }), ai: offlineAI(), secureCookies: false, logRequests: false });

    // Register and login a test user
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', password: 'testpass123' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'testpass123' });

    cookie = loginRes.headers['set-cookie'] as string;
  });

  const upload = (rows: string[]) =>
    request(app).post('/api/expenses/upload').set('Cookie', cookie).attach('statement', csv(rows), 'extrato.csv');

  const getExpenses = () =>
    request(app).get('/api/expenses').set('Cookie', cookie);

  it('uploads a CSV statement and lists the categorized expenses', async () => {
    const res = await upload(['15/03/2026,-42.50,UBER TRIP', '16/03/2026,-120.00,Mercado Extra']);

    expect(res.status).toBe(200);
    expect(res.body.expenses).toHaveLength(2);

    const list = await getExpenses();
    expect(list.body.map((e: any) => [e.date, e.amount, e.description, e.category])).toEqual([
      ['2026-03-16', 120, 'Mercado Extra', 'Mercado'],
      ['2026-03-15', 42.5, 'UBER TRIP', 'Transporte'],
    ]);
  });

  it('stores a refund on a card invoice as spending taken back, not as income', async () => {
    const res = await upload(['15/03/2026,120.00,LOJA X', '16/03/2026,+120.00,ESTORNO LOJA X', '17/03/2026,30.00,PADARIA']);

    expect(res.status).toBe(200);
    const list = await getExpenses();
    expect(list.body.map((e: any) => [e.description, e.amount, e.type])).toEqual([
      ['PADARIA', 30, 'expense'],
      ['ESTORNO LOJA X', -120, 'expense'],
      ['LOJA X', 120, 'expense'],
    ]);
  });

  it('applies a user correction to future uploads of the same description', async () => {
    const first = await upload(['15/03/2026,-42.50,UBER TRIP']);
    const put = await request(app)
      .put(`/api/expenses/${first.body.expenses[0].id}`)
      .set('Cookie', cookie)
      .send({ category: 'Lazer' });
    expect(put.status).toBe(200);

    const second = await upload(['20/03/2026,-30.00,UBER TRIP']);

    expect(second.body.expenses[0].category).toBe('Lazer');
  });

  it('keeps a learned correction after the corrected expense is deleted', async () => {
    const first = await upload(['15/03/2026,-42.50,UBER TRIP']);
    const id = first.body.expenses[0].id;
    await request(app).put(`/api/expenses/${id}`).set('Cookie', cookie).send({ category: 'Lazer' });

    expect((await request(app).delete(`/api/expenses/${id}`).set('Cookie', cookie)).status).toBe(200);

    const second = await upload(['20/03/2026,-30.00,UBER TRIP']);
    expect(second.body.expenses[0].category).toBe('Lazer');
  });

  it('matches category keywords regardless of accents and case', async () => {
    const res = await upload(['15/03/2026,-89.90,FARMÁCIA PAGUE MENOS']);

    expect(res.body.expenses[0].category).toBe('Saúde');
  });

  it('categorizes unrecognized descriptions as Outros', async () => {
    const res = await upload(['15/03/2026,-10.00,XPTO 123']);

    expect(res.body.expenses[0].category).toBe('Outros');
  });

  it('files investment moves under Investimentos whatever the AI answers', async () => {
    const wrongAI = { mode: 'nvidia', categorizeExpense: async () => 'Compras' } as unknown as AIService;
    app = createApp({ db: await DatabaseService.connect({ url: ':memory:' }), ai: wrongAI, secureCookies: false, logRequests: false });
    await request(app).post('/api/auth/register').send({ username: 'investor', password: 'testpass123' });
    cookie = (await request(app).post('/api/auth/login').send({ username: 'investor', password: 'testpass123' })).headers['set-cookie'] as string;

    const res = await upload(['15/03/2026,-500.00,Aplicação na caixinha', '16/03/2026,+60.19,Resgate - CDB Porq Obj BANCO INTER', '17/03/2026,-3.99,OXXO']);

    expect(res.body.expenses.map((e: any) => [e.category, e.type])).toEqual([
      ['Investimentos', 'expense'],
      ['Investimentos', 'income'],
      ['Compras', 'expense'],
    ]);
  });

  it('suggests and applies new categories for entries saved in Outros before the rules knew them', async () => {
    const db = await DatabaseService.connect({ url: ':memory:' });
    app = createApp({ db, ai: offlineAI(), secureCookies: false, logRequests: false });
    await request(app).post('/api/auth/register').send({ username: 'old', password: 'testpass123' });
    cookie = (await request(app).post('/api/auth/login').send({ username: 'old', password: 'testpass123' })).headers['set-cookie'] as string;
    const userId = (await db.getUserByUsername('old'))!.id;
    await db.createExpenseForUser(userId, { id: 'adega', date: '2026-09-05', amount: 53, description: 'Compra no débito - Mp *adegar7 Sao Paulo Bra', category: 'Outros', type: 'expense' });
    await db.createExpenseForUser(userId, { id: 'saque', date: '2026-08-16', amount: 50, description: 'SAQUE BANCO 24H - SAQUE BANCO 24H', category: 'Outros', type: 'expense' });
    await db.createExpenseForUser(userId, { id: 'nada', date: '2026-08-21', amount: 2, description: 'Compra no débito', category: 'Outros', type: 'expense' });

    const listed = await request(app).get('/api/expenses/recategorize').set('Cookie', cookie);
    expect(listed.body.suggestions.map((s: any) => [s.id, s.description, s.from, s.to])).toEqual([
      ['adega', 'Compra no débito - Mp *adegar7 Sao Paulo Bra', 'Outros', 'Alimentação'],
      ['saque', 'SAQUE BANCO 24H - SAQUE BANCO 24H', 'Outros', 'Saques'],
    ]);

    const applied = await request(app).post('/api/expenses/recategorize').set('Cookie', cookie).send({ ids: ['adega', 'saque', 'nada'] });
    expect(applied.body).toEqual({ updated: 2 });
    const { body } = await getExpenses();
    expect(Object.fromEntries(body.map((e: any) => [e.id, e.category]))).toEqual({ adega: 'Alimentação', saque: 'Saques', nada: 'Outros' });
  });

  it('edits the description and amount of an expense', async () => {
    const { body } = await upload(['15/03/2026,-10.00,UBER TRIP']);
    const id = body.expenses[0].id;

    const put = await request(app).put(`/api/expenses/${id}`).set('Cookie', cookie).send({ description: 'Uber aeroporto', amount: 58.4 });
    expect(put.status).toBe(200);

    const { body: expense } = await request(app).get(`/api/expenses/${id}`).set('Cookie', cookie);
    expect([expense.description, expense.amount, expense.category]).toEqual(['Uber aeroporto', 58.4, 'Transporte']);
  });

  it('rejects an edit with an invalid amount', async () => {
    const { body } = await upload(['15/03/2026,-10.00,UBER TRIP']);

    const put = await request(app).put(`/api/expenses/${body.expenses[0].id}`).set('Cookie', cookie).send({ amount: 0 });

    expect(put.status).toBe(400);
    expect(put.body.error).toMatch(/valor/i);
  });

  it('accepts a negative amount on spending, which is a refund, but not on income', async () => {
    const { body } = await upload(['15/03/2026,-10.00,UBER TRIP']);
    const id = body.expenses[0].id;

    expect((await request(app).put(`/api/expenses/${id}`).set('Cookie', cookie).send({ amount: -10 })).status).toBe(200);
    expect((await request(app).put(`/api/expenses/${id}`).set('Cookie', cookie).send({ type: 'income' })).status).toBe(400);
  });

  it('reports whether AI categorization is enabled', async () => {
    const res = await request(app).get('/api/health');

    expect(res.body).toMatchObject({ status: 'OK', ai: 'keywords' });
  });

  it('deletes an expense', async () => {
    const { body } = await upload(['15/03/2026,-10.00,UBER TRIP']);
    const id = body.expenses[0].id;

    expect((await request(app).delete(`/api/expenses/${id}`).set('Cookie', cookie)).status).toBe(200);
    expect((await request(app).get(`/api/expenses/${id}`).set('Cookie', cookie)).status).toBe(404);
  });

  it("hides another user's expense as not found on read, update and delete", async () => {
    const { body } = await upload(['15/03/2026,-42.50,UBER TRIP']);
    const id = body.expenses[0].id;

    await request(app).post('/api/auth/register').send({ username: 'outro', password: 'outra-senha-123' });
    const other = String((await request(app).post('/api/auth/login').send({ username: 'outro', password: 'outra-senha-123' })).headers['set-cookie']);

    expect((await request(app).get(`/api/expenses/${id}`).set('Cookie', other)).status).toBe(404);
    expect((await request(app).put(`/api/expenses/${id}`).set('Cookie', other).send({ category: 'Lazer' })).status).toBe(404);
    expect((await request(app).delete(`/api/expenses/${id}`).set('Cookie', other)).status).toBe(404);
    expect((await request(app).get(`/api/expenses/${id}`).set('Cookie', cookie)).status).toBe(200);
  });

  it('rejects files that are not PDF or CSV', async () => {
    const res = await request(app)
      .post('/api/expenses/upload')
      .set('Cookie', cookie)
      .attach('statement', Buffer.from('x'), 'extrato.txt');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/PDF ou CSV/);
  });

  it('explains why an unreadable PDF was rejected', async () => {
    const res = await request(app)
      .post('/api/expenses/upload')
      .set('Cookie', cookie)
      .attach('statement', Buffer.from('não é um pdf'), 'extrato.pdf');

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Não foi possível ler o PDF/);
  });

  it('hides internal error details from the client when an upload fails', async () => {
    const failing = createApp({
      db: await DatabaseService.connect({ url: ':memory:' }),
      ai: offlineAI(),
      fileProcessor: { processFile: async () => { throw new Error('SQLITE_ERROR: table expenses has no column named type'); } } as any,
      logRequests: false,
    });
    const session = String((await request(failing).post('/api/auth/register').send({ username: 'u', password: 'senha-segura-1' })).headers['set-cookie']);

    const res = await request(failing).post('/api/expenses/upload').set('Cookie', session).attach('statement', csv([]), 'extrato.csv');

    expect(res.status).toBe(500);
    expect(res.body.error).not.toMatch(/SQLITE/);
  });

  describe('duplicate uploads', () => {
    const rows = ['15/03/2026,-42.50,UBER TRIP', '16/03/2026,-120.00,Mercado Extra', '17/03/2026,3000.00,SALARIO'];

    it('skips every transaction when the same statement is uploaded twice', async () => {
      await upload(rows);

      const again = await upload(rows);

      expect(again.status).toBe(200);
      expect(again.body.expenses).toEqual([]);
      expect(again.body.duplicates).toBe(3);
      expect(again.body.message).toMatch(/já estavam salvas/);
      expect((await getExpenses()).body).toHaveLength(3);
    });

    it('imports only the new transactions of a statement that overlaps an earlier one', async () => {
      await upload(rows.slice(0, 2));

      const res = await upload(rows);

      expect(res.body.expenses.map((e: any) => e.description)).toEqual(['SALARIO']);
      expect(res.body.duplicates).toBe(2);
      expect((await getExpenses()).body).toHaveLength(3);
    });

    it('keeps identical transactions that appear more than once in the same statement', async () => {
      const twoCoffees = ['15/03/2026,-8.00,CAFE DO PONTO', '15/03/2026,-8.00,CAFE DO PONTO'];

      const first = await upload(twoCoffees);
      const again = await upload(twoCoffees);

      expect(first.body.expenses).toHaveLength(2);
      expect(first.body.duplicates).toBe(0);
      expect(again.body.duplicates).toBe(2);
      expect((await getExpenses()).body).toHaveLength(2);
    });

    it('imports the extra copy when a later statement has one more identical transaction', async () => {
      await upload(['15/03/2026,-8.00,CAFE DO PONTO']);

      const res = await upload(['15/03/2026,-8.00,CAFE DO PONTO', '15/03/2026,-8.00,CAFE DO PONTO']);

      expect(res.body.expenses).toHaveLength(1);
      expect(res.body.duplicates).toBe(1);
    });

    it('treats descriptions that differ only in case or spacing as the same transaction', async () => {
      await upload(['15/03/2026,-42.50,UBER TRIP']);

      const res = await upload(['15/03/2026,-42.50,Uber  Trip ']);

      expect(res.body.duplicates).toBe(1);
    });

    it('still imports a transaction with the same description on another date or with another amount', async () => {
      await upload(['15/03/2026,-42.50,UBER TRIP']);

      const res = await upload(['16/03/2026,-42.50,UBER TRIP', '15/03/2026,-42.51,UBER TRIP']);

      expect(res.body.expenses).toHaveLength(2);
      expect(res.body.duplicates).toBe(0);
    });

    it('recognizes a card refund that was already imported', async () => {
      const invoice = ['15/03/2026,120.00,LOJA X', '16/03/2026,+120.00,ESTORNO LOJA X'];
      await upload(invoice);

      const again = await upload(invoice);

      expect(again.body.duplicates).toBe(2);
      expect((await getExpenses()).body).toHaveLength(2);
    });

    it('does not count another user\'s transactions as duplicates', async () => {
      await upload(rows);
      await request(app).post('/api/auth/register').send({ username: 'other', password: 'otherpass123' });
      const login = await request(app).post('/api/auth/login').send({ username: 'other', password: 'otherpass123' });

      const res = await request(app).post('/api/expenses/upload')
        .set('Cookie', login.headers['set-cookie'] as unknown as string[])
        .attach('statement', csv(rows), 'extrato.csv');

      expect(res.body.expenses).toHaveLength(3);
      expect(res.body.duplicates).toBe(0);
    });

    it('imports again a transaction that was deleted after the first upload', async () => {
      const first = await upload(rows.slice(0, 1));
      await request(app).delete(`/api/expenses/${first.body.expenses[0].id}`).set('Cookie', cookie);

      const res = await upload(rows.slice(0, 1));

      expect(res.body.expenses).toHaveLength(1);
    });
  });

  it('rejects a statement with more than 300 transactions without saving any of them', async () => {
    const rows = Array.from({ length: 301 }, (_, i) => `15/03/2026,-1.00,COMPRA ${i}`);

    const res = await upload(rows);

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/300/);
    expect((await getExpenses()).body).toEqual([]);
  });
});

describe('/api/expenses/repeated', () => {
  let db: DatabaseService;
  let app: ReturnType<typeof createApp>;
  let cookie: string;

  const login = async (username: string) => {
    await request(app).post('/api/auth/register').send({ username, password: 'testpass123' });
    const res = await request(app).post('/api/auth/login').send({ username, password: 'testpass123' });
    return res.headers['set-cookie'] as unknown as string;
  };

  beforeEach(async () => {
    db = await DatabaseService.connect({ url: ':memory:' });
    app = createApp({ db, ai: offlineAI(), secureCookies: false, logRequests: false });
    cookie = await login('testuser');
  });

  const userId = async (username: string) => (await db.getUserByUsername(username))!.id;

  /** Saves a transaction as an upload from before duplicates were skipped did. */
  const saveImported = async (username: string, description: string, sourceFile: string, createdAt: string) => {
    const id = randomUUID();
    await db.createExpenseForUser(await userId(username), {
      id, date: '2026-09-10', amount: 50, description, category: 'Outros', type: 'expense', sourceFile,
    });
    await (db as unknown as { client: Client }).client.execute({ sql: 'UPDATE expenses SET created_at = ? WHERE id = ?', args: [createdAt, id] });
    return id;
  };

  const preview = (c = cookie) => request(app).get('/api/expenses/repeated').set('Cookie', c);
  const remove = (ids: string[], c = cookie) =>
    request(app).post('/api/expenses/repeated/remove').set('Cookie', c).send({ ids });

  it('lists the copies left by importing the same statement twice', async () => {
    await saveImported('testuser', 'MERCADO', 'extrato.csv', '2026-09-11 10:00:00');
    const copy = await saveImported('testuser', 'MERCADO', 'extrato.csv', '2026-09-12 10:00:00');
    await saveImported('testuser', 'PADARIA', 'extrato.csv', '2026-09-11 10:00:00');

    const res = await preview();

    expect(res.status).toBe(200);
    expect(res.body.expenses.map((e: any) => [e.id, e.description])).toEqual([[copy, 'MERCADO']]);
  });

  it('removes the copies and keeps the original', async () => {
    const original = await saveImported('testuser', 'MERCADO', 'extrato.csv', '2026-09-11 10:00:00');
    const copy = await saveImported('testuser', 'MERCADO', 'extrato.pdf', '2026-09-12 10:00:00');

    const res = await remove([copy]);

    expect(res.status).toBe(200);
    expect(res.body.removed).toBe(1);
    const left = await request(app).get('/api/expenses').set('Cookie', cookie);
    expect(left.body.map((e: any) => e.id)).toEqual([original]);
    expect((await preview()).body.expenses).toEqual([]);
  });

  it('only removes ids that are still repeated copies', async () => {
    const original = await saveImported('testuser', 'MERCADO', 'extrato.csv', '2026-09-11 10:00:00');
    const copy = await saveImported('testuser', 'MERCADO', 'extrato.csv', '2026-09-12 10:00:00');
    const unique = await saveImported('testuser', 'PADARIA', 'extrato.csv', '2026-09-11 10:00:00');

    const res = await remove([original, copy, unique]);

    expect(res.body.removed).toBe(1);
    const left = await request(app).get('/api/expenses').set('Cookie', cookie);
    expect(left.body.map((e: any) => e.id).sort()).toEqual([original, unique].sort());
  });

  it("never touches another user's transactions", async () => {
    const other = await login('other');
    await saveImported('other', 'MERCADO', 'extrato.csv', '2026-09-11 10:00:00');
    const theirCopy = await saveImported('other', 'MERCADO', 'extrato.csv', '2026-09-12 10:00:00');

    expect((await preview()).body.expenses).toEqual([]);
    expect((await remove([theirCopy])).body.removed).toBe(0);
    expect((await preview(other)).body.expenses.map((e: any) => e.id)).toEqual([theirCopy]);
  });

  it('rejects a body without a list of ids', async () => {
    expect((await request(app).post('/api/expenses/repeated/remove').set('Cookie', cookie).send({})).status).toBe(400);
  });
});

describe('/api/expenses/imports', () => {
  let db: DatabaseService;
  let app: ReturnType<typeof createApp>;

  const login = async (username: string) => {
    await request(app).post('/api/auth/register').send({ username, password: 'testpass123' });
    const res = await request(app).post('/api/auth/login').send({ username, password: 'testpass123' });
    return res.headers['set-cookie'] as unknown as string;
  };

  beforeEach(async () => {
    db = await DatabaseService.connect({ url: ':memory:' });
    app = createApp({ db, ai: offlineAI(), secureCookies: false, logRequests: false });
  });

  const save = async (username: string, description: string, sourceFile?: string) => {
    const id = randomUUID();
    await db.createExpenseForUser((await db.getUserByUsername(username))!.id, {
      id, date: '2026-09-10', amount: 50, description, category: 'Outros', type: 'expense', sourceFile,
    });
    return id;
  };

  const history = (cookie: string) => request(app).get('/api/expenses/imports').set('Cookie', cookie);
  const clear = (cookie: string) => request(app).delete('/api/expenses/imports').set('Cookie', cookie);

  it('lists the imported files with how many transactions came from each', async () => {
    const mike = await login('Mike');
    await save('Mike', 'MERCADO', 'extrato-set.csv');
    await save('Mike', 'PADARIA', 'extrato-set.csv');
    await save('Mike', 'UBER', 'fatura.pdf');
    await save('Mike', 'ALUGUEL');

    const res = await history(mike);

    expect(res.status).toBe(200);
    expect(res.body.files).toEqual([
      { name: 'extrato-set.csv', transactions: 2 },
      { name: 'fatura.pdf', transactions: 1 },
    ]);
  });

  it('deletes every imported transaction and keeps the ones typed by hand', async () => {
    const mike = await login('Mike');
    await save('Mike', 'MERCADO', 'extrato-set.csv');
    await save('Mike', 'UBER', 'fatura.pdf');
    const manual = await save('Mike', 'ALUGUEL');

    const res = await clear(mike);

    expect(res.status).toBe(200);
    expect(res.body.removed).toBe(2);
    const left = await request(app).get('/api/expenses').set('Cookie', mike);
    expect(left.body.map((e: any) => e.id)).toEqual([manual]);
    expect((await history(mike)).body.files).toEqual([]);
  });

  it('deletes only the transactions of the chosen files', async () => {
    const mike = await login('Mike');
    await save('Mike', 'MERCADO', 'extrato-set.csv');
    await save('Mike', 'PADARIA', 'extrato-set.csv');
    const uber = await save('Mike', 'UBER', 'fatura.pdf');
    const manual = await save('Mike', 'ALUGUEL');

    const res = await request(app).delete('/api/expenses/imports').set('Cookie', mike).send({ files: ['extrato-set.csv'] });

    expect(res.status).toBe(200);
    expect(res.body.removed).toBe(2);
    const left = await request(app).get('/api/expenses').set('Cookie', mike);
    expect(left.body.map((e: any) => e.id).sort()).toEqual([uber, manual].sort());
    expect((await history(mike)).body.files).toEqual([{ name: 'fatura.pdf', transactions: 1 }]);
  });

  it('deletes nothing when the chosen list is empty', async () => {
    const mike = await login('Mike');
    await save('Mike', 'MERCADO', 'extrato-set.csv');

    const res = await request(app).delete('/api/expenses/imports').set('Cookie', mike).send({ files: [] });

    expect(res.body.removed).toBe(0);
    expect((await history(mike)).body.files).toHaveLength(1);
  });

  it('rejects a list of files that is not made of names', async () => {
    const mike = await login('Mike');
    const res = await request(app).delete('/api/expenses/imports').set('Cookie', mike).send({ files: 'extrato.csv' });
    expect(res.status).toBe(400);
  });

  it("never touches another user's imports", async () => {
    const mike = await login('Mike');
    await login('other');
    const theirs = await save('other', 'MERCADO', 'extrato.csv');

    await clear(mike);

    const stillThere = await db.getExpenseByIdForUser((await db.getUserByUsername('other'))!.id, theirs);
    expect(stillThere).toBeDefined();
  });

  it('is refused on the server for users outside the allowlist', async () => {
    const other = await login('other');
    const kept = await save('other', 'MERCADO', 'extrato.csv');

    expect((await history(other)).status).toBe(403);
    expect((await clear(other)).status).toBe(403);
    const left = await request(app).get('/api/expenses').set('Cookie', other);
    expect(left.body.map((e: any) => e.id)).toEqual([kept]);
  });

  it('requires a session', async () => {
    expect((await request(app).delete('/api/expenses/imports')).status).toBe(401);
  });
});
