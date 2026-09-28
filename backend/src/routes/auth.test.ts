import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { DatabaseService } from '../services/database.service';
import { AIService } from '../services/ai.service';

const PASSWORD = 'segredo-de-teste';

describe('password protection', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    app = createApp({
      db: await DatabaseService.connect({ url: ':memory:' }),
      ai: new AIService({ apiKey: '', apiUrl: '', model: '' }),
      password: PASSWORD,
      logRequests: false,
    });
  });

  const login = (password: string) => request(app).post('/api/auth/login').send({ password });

  it('blocks the expenses API without a session', async () => {
    expect((await request(app).get('/api/expenses')).status).toBe(401);
  });

  it('rejects a wrong password', async () => {
    const res = await login('errada');

    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('grants access after logging in with the right password', async () => {
    const res = await login(PASSWORD);
    const cookie = res.headers['set-cookie'];

    expect(res.status).toBe(200);
    expect(String(cookie)).toMatch(/HttpOnly/i);
    expect((await request(app).get('/api/expenses').set('Cookie', cookie)).status).toBe(200);
    expect((await request(app).get('/api/auth/session').set('Cookie', cookie)).body).toEqual({ required: true, authenticated: true });
  });

  it('rejects a tampered session cookie', async () => {
    const res = await request(app).get('/api/expenses').set('Cookie', 'freyr_session=9999999999999.forjado');

    expect(res.status).toBe(401);
  });

  it('ends the session on logout', async () => {
    const cookie = (await login(PASSWORD)).headers['set-cookie'];
    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie);

    expect(String(logout.headers['set-cookie'])).toMatch(/freyr_session=;/);
    expect((await request(app).get('/api/auth/session')).body).toEqual({ required: true, authenticated: false });
  });

  it('keeps the health check public', async () => {
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
});
