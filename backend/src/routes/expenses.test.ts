import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { DatabaseService } from '../services/database.service';
import { AIService } from '../services/ai.service';

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
