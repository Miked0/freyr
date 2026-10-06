import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { DatabaseService } from '../services/database.service';
import { AIService } from '../services/ai.service';

const offlineAI = () => new AIService({ apiKey: '', apiUrl: '', model: '' });

const csv = (rows: string[]) => Buffer.from(['date,amount,description', ...rows].join('\n'));

describe('/api/categories', () => {
  let app: ReturnType<typeof createApp>;
  let db: DatabaseService;
  let cookie: string;

  const login = async (username: string, password: string) => {
    await request(app).post('/api/auth/register').send({ username, password });
    return String((await request(app).post('/api/auth/login').send({ username, password })).headers['set-cookie']);
  };

  beforeEach(async () => {
    db = await DatabaseService.connect({ url: ':memory:' });
    app = createApp({ db, ai: offlineAI(), secureCookies: false, logRequests: false });
    cookie = await login('testuser', 'testpass123');
  });

  const list = (session = cookie) => request(app).get('/api/categories').set('Cookie', session);
  const upload = (rows: string[], session = cookie) =>
    request(app).post('/api/expenses/upload').set('Cookie', session).attach('statement', csv(rows), 'extrato.csv');
  const setCategory = (id: string, category: string, session = cookie) =>
    request(app).put(`/api/expenses/${id}`).set('Cookie', session).send({ category });
  const remove = (id: string, session = cookie) => request(app).delete(`/api/categories/${id}`).set('Cookie', session);
  const create = (name: unknown, session = cookie) => request(app).post('/api/categories').set('Cookie', session).send({ name });

  it('requires a session', async () => {
    expect((await request(app).get('/api/categories')).status).toBe(401);
  });

  it('lists the default categories, none of them custom, and how many custom ones the account may create', async () => {
    const res = await list();

    expect(res.status).toBe(200);
    expect(res.body.categories.map((c: { name: string }) => c.name)).toContain('Mercado');
    expect(res.body.categories.every((c: { is_custom: boolean }) => c.is_custom === false)).toBe(true);
    expect(res.body.custom_limit).toBeGreaterThan(0);
  });

  it('creates a custom category and lists it as custom', async () => {
    const res = await create('  Pets da Luna ');

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(String), name: 'Pets da Luna', is_custom: true });
    expect((await list()).body.categories).toContainEqual(res.body);
  });

  it('refuses a category without a name', async () => {
    for (const name of ['   ', undefined, 42]) {
      const res = await create(name);
      expect(res.status).toBe(400);
      expect(res.body.error).toEqual(expect.any(String));
    }
    expect((await list()).body.categories.some((c: { is_custom: boolean }) => c.is_custom)).toBe(false);
  });

  it('refuses a name longer than a category tag can show', async () => {
    expect((await create('a'.repeat(40))).status).toBe(201);
    expect((await create('b'.repeat(41))).status).toBe(400);
  });

  it('refuses a name the account already has, ignoring case and accents', async () => {
    await create('Pets da Luna');
    for (const name of ['mercado', 'SAUDE', 'pets  da luna']) {
      const res = await create(name);
      expect(res.status).toBe(409);
      expect(res.body.error).toEqual(expect.any(String));
    }
  });

  it('stops creating at the account limit, counting only custom categories', async () => {
    const limit: number = (await list()).body.custom_limit;
    for (let i = 1; i <= limit; i++) expect((await create(`Minha ${i}`)).status).toBe(201);

    const res = await create('Uma a mais');

    expect(res.status).toBe(403);
    expect(res.body.error).toContain(String(limit));
    expect((await list()).body.categories.filter((c: { is_custom: boolean }) => c.is_custom)).toHaveLength(limit);
  });

  it('keeps each account\'s categories and limit to itself', async () => {
    const limit: number = (await list()).body.custom_limit;
    for (let i = 1; i <= limit; i++) await create(`Minha ${i}`);
    const other = await login('outra', 'outrasenha123');

    expect((await list(other)).body.categories.some((c: { is_custom: boolean }) => c.is_custom)).toBe(false);
    expect((await create('Minha 1', other)).status).toBe(201);
  });

  it('files a transaction under a custom category, and later imports of the same description follow it', async () => {
    await create('Pets da Luna');
    const first = await upload(['15/03/2026,-89.90,PETZ MORUMBI']);

    expect((await setCategory(first.body.expenses[0].id, 'Pets da Luna')).status).toBe(200);
    const second = await upload(['15/04/2026,-59.90,PETZ MORUMBI']);

    expect(second.body.expenses[0].category).toBe('Pets da Luna');
  });

  it('refuses to file a transaction under a category the account does not have', async () => {
    const { body } = await upload(['15/03/2026,-89.90,PETZ MORUMBI']);

    const res = await setCategory(body.expenses[0].id, 'Inventada');

    expect(res.status).toBe(400);
    expect((await request(app).get(`/api/expenses/${body.expenses[0].id}`).set('Cookie', cookie)).body.category).toBe('Pets');
  });

  it('deletes a custom category, moving its transactions to Outros and freeing its slot', async () => {
    const limit: number = (await list()).body.custom_limit;
    const created = await create('Pets da Luna');
    for (let i = 2; i <= limit; i++) await create(`Minha ${i}`);
    const { body } = await upload(['15/03/2026,-89.90,PETZ MORUMBI']);
    await setCategory(body.expenses[0].id, 'Pets da Luna');

    expect((await remove(created.body.id)).status).toBe(200);

    expect((await list()).body.categories.map((c: { name: string }) => c.name)).not.toContain('Pets da Luna');
    expect((await request(app).get(`/api/expenses/${body.expenses[0].id}`).set('Cookie', cookie)).body.category).toBe('Outros');
    expect((await upload(['15/04/2026,-59.90,PETZ MORUMBI'])).body.expenses[0].category).not.toBe('Pets da Luna');
    expect((await create('Outra')).status).toBe(201);
  });

  it('deletes neither a default category nor another account\'s', async () => {
    const mercado = (await list()).body.categories.find((c: { name: string }) => c.name === 'Mercado');
    const other = await login('outra', 'outrasenha123');
    const theirs = await create('Delas', other);

    expect((await remove(mercado.id)).status).toBe(404);
    expect((await remove(theirs.body.id)).status).toBe(404);
    expect((await list()).body.categories.map((c: { name: string }) => c.name)).toContain('Mercado');
    expect((await list(other)).body.categories.map((c: { name: string }) => c.name)).toContain('Delas');
  });

  describe('what the platform learns from custom categories', () => {
    it('keeps the store and the custom category name, with nothing else about the transaction', async () => {
      await create('Pets da Luna');
      const { body } = await upload(['15/03/2026,-89.90,PETZ MORUMBI']);

      await setCategory(body.expenses[0].id, 'Pets da Luna');

      expect(await db.getCategorySignals()).toEqual([{ pattern: 'petz morumbi', category: 'Pets da Luna', users: 1 }]);
    });
    it('learns only from custom categories, not from moves between the default ones', async () => {
      const { body } = await upload(['15/03/2026,-89.90,PETZ MORUMBI']);

      await setCategory(body.expenses[0].id, 'Compras');

      expect(await db.getCategorySignals()).toEqual([]);
    });
    it('masks documents and account numbers in the store name', async () => {
      await create('Pets da Luna');
      const { body } = await upload(['15/03/2026,-89.90,PETZ CPF 123.456.789-00']);

      await setCategory(body.expenses[0].id, 'Pets da Luna');

      expect((await db.getCategorySignals()).map(s => s.pattern)).toEqual(['petz cpf ***']);
    });

    it('learns nothing from a transfer, since it names a person rather than a store', async () => {
      await create('Mesada');
      const { body } = await upload(['15/03/2026,-200.00,Pix enviado - Maria da Silva']);

      await setCategory(body.expenses[0].id, 'Mesada');

      expect(await db.getCategorySignals()).toEqual([]);
    });
    it('keeps only the store from a card purchase: no kind of transaction, no city', async () => {
      await create('Pets da Luna');
      const { body } = await upload(['15/03/2026,-89.90,Compra no débito - Petz Morumbi Shopping Sao Paulo Bra']);

      await setCategory(body.expenses[0].id, 'Pets da Luna');

      expect((await db.getCategorySignals()).map(s => s.pattern)).toEqual(['petz morumbi shopping']);
    });
    it('counts how many accounts filed a store under the same category name', async () => {
      const other = await login('outra', 'outrasenha123');
      for (const session of [cookie, other]) {
        await create('Bichos', session);
        const { body } = await upload(['15/03/2026,-89.90,PETZ MORUMBI'], session);
        await setCategory(body.expenses[0].id, 'Bichos', session);
      }

      expect(await db.getCategorySignals()).toEqual([{ pattern: 'petz morumbi', category: 'Bichos', users: 2 }]);
    });

    it('forgets what an account taught once the account is deleted', async () => {
      await create('Bichos');
      const { body } = await upload(['15/03/2026,-89.90,PETZ MORUMBI']);
      await setCategory(body.expenses[0].id, 'Bichos');

      await db.deleteUser((await db.getUserByUsername('testuser'))!.id);

      expect(await db.getCategorySignals()).toEqual([]);
    });
    it('forgets what a custom category taught once the user deletes it', async () => {
      const bichos = await create('Bichos');
      const { body } = await upload(['15/03/2026,-89.90,PETZ MORUMBI']);
      await setCategory(body.expenses[0].id, 'Bichos');

      await remove(bichos.body.id);

      expect(await db.getCategorySignals()).toEqual([]);
    });
  });
});
