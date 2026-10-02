import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { DatabaseService } from '../services/database.service';
import { AIService } from '../services/ai.service';

const offlineAI = () => new AIService({ apiKey: '', apiUrl: '', model: '' });

describe('/api/goals', () => {
  let app: ReturnType<typeof createApp>;
  let cookie: string;

  const login = async (username: string, password: string) => {
    await request(app).post('/api/auth/register').send({ username, password });
    return String((await request(app).post('/api/auth/login').send({ username, password })).headers['set-cookie']);
  };

  beforeEach(async () => {
    app = createApp({ db: await DatabaseService.connect({ url: ':memory:' }), ai: offlineAI(), secureCookies: false, logRequests: false });
    cookie = await login('testuser', 'testpass123');
  });

  const create = (body: object, session = cookie) => request(app).post('/api/goals').set('Cookie', session).send(body);
  const list = (session = cookie) => request(app).get('/api/goals').set('Cookie', session);

  it('requires a session', async () => {
    expect((await request(app).get('/api/goals')).status).toBe(401);
  });

  it('starts with no goals', async () => {
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('creates a goal and lists it', async () => {
    const res = await create({ name: '  Reserva de emergência ', target: 10000, saved: 2500, due: '2026-12' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(String), name: 'Reserva de emergência', target: 10000, saved: 2500, due: '2026-12' });
    expect((await list()).body).toEqual([res.body]);
  });

  it('defaults saved to zero and due to none', async () => {
    const res = await create({ name: 'Notebook', target: 7500 });
    expect(res.body).toMatchObject({ saved: 0, due: null });
  });

  it('lists goals by nearest due date, those without one last', async () => {
    await create({ name: 'Sem prazo', target: 100 });
    await create({ name: 'Longe', target: 100, due: '2027-07' });
    await create({ name: 'Perto', target: 100, due: '2026-12' });

    expect((await list()).body.map((g: any) => g.name)).toEqual(['Perto', 'Longe', 'Sem prazo']);
  });

  it.each([
    [{ target: 100 }, /nome/i],
    [{ name: '   ', target: 100 }, /nome/i],
    [{ name: 'x'.repeat(41), target: 100 }, /40/],
    [{ name: 'Meta' }, /valor/i],
    [{ name: 'Meta', target: 0 }, /valor/i],
    [{ name: 'Meta', target: '100' }, /valor/i],
    [{ name: 'Meta', target: 100, saved: -1 }, /guardado/i],
    [{ name: 'Meta', target: 100, due: '2026-13' }, /prazo/i],
    [{ name: 'Meta', target: 100, due: '12/2026' }, /prazo/i],
  ])('rejects an invalid goal %j', async (body, message) => {
    const res = await create(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(message);
    expect((await list()).body).toEqual([]);
  });

  it('updates some fields of a goal and keeps the others', async () => {
    const { body: goal } = await create({ name: 'Viagem', target: 12000, saved: 100, due: '2027-07' });

    const res = await request(app).patch(`/api/goals/${goal.id}`).set('Cookie', cookie).send({ saved: 4150, due: null });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...goal, saved: 4150, due: null });
    expect((await list()).body).toEqual([res.body]);
  });

  it('rejects an invalid or empty update', async () => {
    const { body: goal } = await create({ name: 'Viagem', target: 12000 });
    const patch = (body: object) => request(app).patch(`/api/goals/${goal.id}`).set('Cookie', cookie).send(body);

    expect((await patch({ target: -5 })).status).toBe(400);
    expect((await patch({ name: '' })).status).toBe(400);
    expect((await patch({})).status).toBe(400);
    expect((await list()).body).toEqual([goal]);
  });

  it('deletes a goal', async () => {
    const { body: goal } = await create({ name: 'Viagem', target: 12000 });

    expect((await request(app).delete(`/api/goals/${goal.id}`).set('Cookie', cookie)).status).toBe(204);
    expect((await list()).body).toEqual([]);
    expect((await request(app).delete(`/api/goals/${goal.id}`).set('Cookie', cookie)).status).toBe(404);
  });

  it("keeps each user's goals private", async () => {
    const { body: goal } = await create({ name: 'Viagem', target: 12000 });
    const other = await login('outro', 'outra-senha-123');

    expect((await list(other)).body).toEqual([]);
    expect((await request(app).patch(`/api/goals/${goal.id}`).set('Cookie', other).send({ saved: 1 })).status).toBe(404);
    expect((await request(app).delete(`/api/goals/${goal.id}`).set('Cookie', other)).status).toBe(404);
    expect((await list()).body).toEqual([goal]);
  });
});
