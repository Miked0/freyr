import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createClient } from '@libsql/client';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createApp } from '../app';
import { DatabaseService } from '../services/database.service';
import { AIService } from '../services/ai.service';

const PASSWORD = 'senha-de-teste-1';

describe('profile', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    app = createApp({
      db: await DatabaseService.connect({ url: ':memory:' }),
      ai: new AIService({ apiKey: '', apiUrl: '', model: '' }),
      secureCookies: false,
      logRequests: false,
    });
  });

  async function signUp(username: string): Promise<string> {
    const res = await request(app).post('/api/auth/register').send({ username, password: PASSWORD });
    return String(res.headers['set-cookie']).split(';')[0];
  }

  const getProfile = (cookie: string) => request(app).get('/api/auth/profile').set('Cookie', cookie);
  const patchProfile = (cookie: string, body: unknown) =>
    request(app).patch('/api/auth/profile').set('Cookie', cookie).send(body as object);

  it('requires a session', async () => {
    expect((await request(app).get('/api/auth/profile')).status).toBe(401);
    expect((await request(app).patch('/api/auth/profile').send({ display_name: 'X' })).status).toBe(401);
  });

  it('starts with defaults: no display name, brand-primary avatar, no budget', async () => {
    const cookie = await signUp('ana');
    const res = await getProfile(cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: 'ana', display_name: null, avatar_color: 'brand-primary', monthly_budget: null, invested_balance: null, invested_balance_on: null });
  });

  it('saves a trimmed display name, an avatar color and a monthly budget', async () => {
    const cookie = await signUp('ana');
    const res = await patchProfile(cookie, { display_name: '  Ana Souza  ', avatar_color: 'frost', monthly_budget: 3500.5 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: 'ana', display_name: 'Ana Souza', avatar_color: 'frost', monthly_budget: 3500.5, invested_balance: null, invested_balance_on: null });
    expect((await getProfile(cookie)).body).toEqual(res.body);
  });

  it('updates only the fields sent', async () => {
    const cookie = await signUp('ana');
    await patchProfile(cookie, { display_name: 'Ana', monthly_budget: 100 });
    const res = await patchProfile(cookie, { avatar_color: 'hero' });
    expect(res.body).toEqual({ username: 'ana', display_name: 'Ana', avatar_color: 'hero', monthly_budget: 100, invested_balance: null, invested_balance_on: null });
  });

  it('clears the display name and the budget with null', async () => {
    const cookie = await signUp('ana');
    await patchProfile(cookie, { display_name: 'Ana', monthly_budget: 100 });
    const res = await patchProfile(cookie, { display_name: null, monthly_budget: null });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ display_name: null, monthly_budget: null });
  });

  it('saves how much the user has invested today, dated by the server', async () => {
    const cookie = await signUp('ana');
    const today = new Date().toISOString().slice(0, 10);
    const res = await patchProfile(cookie, { invested_balance: 4250.756 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ invested_balance: 4250.76, invested_balance_on: today });

    const cleared = await patchProfile(cookie, { invested_balance: null });
    expect(cleared.body).toMatchObject({ invested_balance: null, invested_balance_on: null });
  });

  it.each([[-1], ['1000'], [1e13]])('rejects %s as the invested balance', async value => {
    const cookie = await signUp('ana');
    expect((await patchProfile(cookie, { invested_balance: value })).status).toBe(400);
  });

  it('accepts every avatar color of the design system', async () => {
    const cookie = await signUp('ana');
    for (const color of ['brand-primary', 'frost', 'brand-warm', 'positive', 'alert', 'hero']) {
      expect((await patchProfile(cookie, { avatar_color: color })).status).toBe(200);
    }
  });

  it.each([
    ['an empty display name', { display_name: '   ' }],
    ['a display name over 40 characters', { display_name: 'a'.repeat(41) }],
    ['a display name that is not a string', { display_name: 42 }],
    ['an unknown avatar color', { avatar_color: 'pink' }],
    ['a null avatar color', { avatar_color: null }],
    ['a negative budget', { monthly_budget: -1 }],
    ['a budget that is not a number', { monthly_budget: '100' }],
    ['an absurdly large budget', { monthly_budget: 1e12 }],
    ['an unknown field', { display_name: 'Ana', username: 'outra' }],
    ['an empty update', {}],
    ['a body that is not an object', ['display_name']],
  ])('rejects %s and keeps the profile unchanged', async (_label, body) => {
    const cookie = await signUp('ana');
    await patchProfile(cookie, { display_name: 'Ana' });
    const res = await patchProfile(cookie, body);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    expect((await getProfile(cookie)).body).toEqual({ username: 'ana', display_name: 'Ana', avatar_color: 'brand-primary', monthly_budget: null, invested_balance: null, invested_balance_on: null });
  });

  it('accepts a display name of exactly 40 characters after trimming', async () => {
    const cookie = await signUp('ana');
    const name = 'b'.repeat(40);
    const res = await patchProfile(cookie, { display_name: ` ${name} ` });
    expect(res.status).toBe(200);
    expect(res.body.display_name).toBe(name);
  });

  it("keeps each user's profile separate", async () => {
    const ana = await signUp('ana');
    const bia = await signUp('bia');
    await patchProfile(ana, { display_name: 'Ana', avatar_color: 'alert', monthly_budget: 10 });
    expect((await getProfile(bia)).body).toEqual({ username: 'bia', display_name: null, avatar_color: 'brand-primary', monthly_budget: null, invested_balance: null, invested_balance_on: null });
    expect((await getProfile(ana)).body.display_name).toBe('Ana');
  });
});

describe('profile columns migration', () => {
  it('adds the profile columns to a users table created before them, idempotently', async () => {
    const url = `file:${path.join(mkdtempSync(path.join(tmpdir(), 'freyr-profile-')), 'old.db').split(path.sep).join('/')}`;
    const legacy = createClient({ url });
    await legacy.execute(`CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, session_version INTEGER NOT NULL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    await legacy.execute(`INSERT INTO users (id, username, password_hash) VALUES ('u1', 'antigo', 'x')`);
    legacy.close();

    await DatabaseService.connect({ url });
    const db = await DatabaseService.connect({ url });

    expect(await db.getProfile('u1')).toEqual({ username: 'antigo', display_name: null, avatar_color: 'brand-primary', monthly_budget: null, invested_balance: null, invested_balance_on: null });
  });
});
