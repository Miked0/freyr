import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { DatabaseService } from '../services/database.service';
import { AIService } from '../services/ai.service';

const TEST_USER = 'testuser';
const TEST_PASS = 'segredo-de-teste';

describe('authentication', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    app = createApp({
      db: await DatabaseService.connect({ url: ':memory:' }),
      ai: new AIService({ apiKey: '', apiUrl: '', model: '' }),
      secureCookies: false,
      logRequests: false,
    });

    // Register a test user before each test
    await request(app)
      .post('/api/auth/register')
      .send({ username: TEST_USER, password: TEST_PASS });
  });

  const login = (username: string, password: string) =>
    request(app).post('/api/auth/login').send({ username, password });

  const register = (username: string, password: string) =>
    request(app).post('/api/auth/register').send({ username, password });

  it('blocks the expenses API without a session', async () => {
    expect((await request(app).get('/api/expenses')).status).toBe(401);
  });

  it('rejects registration with short password', async () => {
    const res = await register('user2', 'short');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mínimo 8/);
  });

  it('rejects duplicate username', async () => {
    const res = await register(TEST_USER, 'otherpass123');
    expect(res.status).toBe(409);
  });

  it('applies the brute-force delay to failed logins only', async () => {
    const delays = () => spy.mock.calls.map(call => call[1]).filter(ms => ms === 500);
    const spy = vi.spyOn(globalThis, 'setTimeout');
    try {
      expect((await login(TEST_USER, TEST_PASS)).status).toBe(200);
      expect(delays()).toHaveLength(0);

      expect((await login(TEST_USER, 'errada')).status).toBe(401);
      expect(delays()).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('answers 409, not 500, when the same username registers twice at once', async () => {
    const results = await Promise.all([register('corrida', 'senha-corrida-1'), register('corrida', 'senha-corrida-2')]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
  });

  it('rejects wrong password', async () => {
    const res = await login(TEST_USER, 'errada');
    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('grants access after logging in with correct credentials', async () => {
    const res = await login(TEST_USER, TEST_PASS);
    const cookie = res.headers['set-cookie'];

    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.user).toEqual({ id: expect.any(String), username: TEST_USER });
    expect(String(cookie)).toMatch(/HttpOnly/i);

    // Can access protected route
    expect((await request(app).get('/api/expenses').set('Cookie', cookie)).status).toBe(200);

    // Session endpoint returns user info
    const session = await request(app).get('/api/auth/session').set('Cookie', cookie);
    expect(session.body).toEqual({
      authenticated: true,
      user: { id: expect.any(String), username: TEST_USER },
    });
  });

  it('rejects a tampered session cookie', async () => {
    const res = await request(app)
      .get('/api/expenses')
      .set('Cookie', 'freyr_session=9999999999999.invalid.signature');
    expect(res.status).toBe(401);
  });

  it('rejects a session cookie whose user id was swapped for another user', async () => {
    const victim = await register('vitima', 'senha-da-vitima');
    const attackerCookie = String((await login(TEST_USER, TEST_PASS)).headers['set-cookie']);
    const [, expiresAt, signature] = attackerCookie.match(/freyr_session=[^.]+\.(\d+)\.([^;]+)/)!;

    const forged = `freyr_session=${victim.body.user.id}.${expiresAt}.${signature}`;
    expect((await request(app).get('/api/expenses').set('Cookie', forged)).status).toBe(401);
  });

  it('ends the session on logout', async () => {
    const cookie = (await login(TEST_USER, TEST_PASS)).headers['set-cookie'];
    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie);

    expect(String(logout.headers['set-cookie'])).toMatch(/freyr_session=;/);
    expect((await request(app).get('/api/auth/session')).body).toEqual({
      authenticated: false,
      user: null,
    });
  });

  it('keeps the health check public', async () => {
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
});
