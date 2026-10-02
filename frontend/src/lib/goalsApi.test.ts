import { afterEach, describe, expect, it, vi } from 'vitest';
import { goalsApi } from './goalsApi';

const goal = { id: 'g1', name: 'Reserva', target: 1000, saved: 100, due: '2026-12' };

function stubFetch(status: number, body?: unknown) {
  const fetchMock = vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('goalsApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists the goals', async () => {
    const fetchMock = stubFetch(200, [goal]);
    expect(await goalsApi.list()).toEqual([goal]);
    expect(fetchMock.mock.calls[0]).toEqual([expect.stringMatching(/\/api\/goals$/), expect.anything()]);
  });

  it('creates, updates and deletes with JSON bodies', async () => {
    const fetchMock = stubFetch(200, goal);
    await goalsApi.create({ name: 'Reserva', target: 1000, saved: 0, due: null });
    await goalsApi.update('g1', { saved: 300 });
    stubFetch(204);
    await goalsApi.remove('g1');

    const [create, update] = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(create[0]).toMatch(/\/api\/goals$/);
    expect(create[1]).toMatchObject({ method: 'POST', body: JSON.stringify({ name: 'Reserva', target: 1000, saved: 0, due: null }) });
    expect(update[0]).toMatch(/\/api\/goals\/g1$/);
    expect(update[1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ saved: 300 }) });
  });

  it("surfaces the server's error message", async () => {
    stubFetch(400, { error: 'Informe um valor-alvo maior que zero.' });
    await expect(goalsApi.create({ name: 'X', target: 0, saved: 0, due: null })).rejects.toThrow(/valor-alvo/);
  });
});
