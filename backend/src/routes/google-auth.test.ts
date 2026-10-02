import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { DatabaseService } from '../services/database.service';
import { AIService } from '../services/ai.service';

const GOOGLE = { clientId: 'client-123.apps.googleusercontent.com', clientSecret: 'segredo-google' };
const CALLBACK = '/api/auth/google/callback';

const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** An ID token as Google's token endpoint returns it; only the payload matters here. */
function idToken(claims: Record<string, unknown> = {}) {
  const payload = {
    iss: 'https://accounts.google.com',
    aud: GOOGLE.clientId,
    sub: 'google-sub-1',
    email: 'mike.silva@gmail.com',
    email_verified: true,
    name: 'Mike Silva',
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...claims,
  };
  return `${b64({ alg: 'RS256' })}.${b64(payload)}.assinatura`;
}

/** Stubs Google's token endpoint to answer with this ID token. */
function googleAnswers(token: string) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id_token: token }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const cookieValue = (res: request.Response, name: string) =>
  ([] as string[]).concat(res.headers['set-cookie'] ?? []).find(c => c.startsWith(`${name}=`))?.split(';')[0];

describe('login with Google', () => {
  let db: DatabaseService;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await DatabaseService.connect({ url: ':memory:' });
    app = createApp({ db, ai: new AIService({ apiKey: '', apiUrl: '', model: '' }), logRequests: false, google: GOOGLE });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Starts the flow and returns the state Google would echo back plus the cookie holding it. */
  async function start() {
    const res = await request(app).get('/api/auth/google');
    const location = new URL(res.headers.location);
    return { res, location, state: location.searchParams.get('state')!, stateCookie: cookieValue(res, 'freyr_oauth_state')! };
  }

  async function finish(token: string, session?: string) {
    googleAnswers(token);
    const { state, stateCookie } = await start();
    return request(app)
      .get(`${CALLBACK}?code=codigo-1&state=${state}`)
      .set('Cookie', [stateCookie, ...(session ? [session] : [])]);
  }

  const sessionOf = (res: request.Response) => cookieValue(res, 'freyr_session')!;
  const whoAmI = async (session: string) => (await request(app).get('/api/auth/session').set('Cookie', session)).body;

  it('tells the app the Google button can be shown', async () => {
    expect((await request(app).get('/api/health')).body.googleLogin).toBe(true);
  });

  it('sends the browser to Google with this app, the callback and a fresh state', async () => {
    const { res, location, state, stateCookie } = await start();

    expect(res.status).toBe(302);
    expect(location.origin + location.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(location.searchParams.get('client_id')).toBe(GOOGLE.clientId);
    expect(location.searchParams.get('redirect_uri')).toMatch(/\/api\/auth\/google\/callback$/);
    expect(location.searchParams.get('scope')).toBe('openid email profile');
    expect(location.searchParams.get('response_type')).toBe('code');
    expect(state).toMatch(/^[\w-]{32,}$/);
    expect(stateCookie).toBe(`freyr_oauth_state=${state}`);
  });

  it('creates an account on the first Google login and opens a session', async () => {
    const res = await finish(idToken());

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
    const me = await whoAmI(sessionOf(res));
    expect(me).toMatchObject({ authenticated: true, user: { username: 'mike.silva' } });
  });

  it('exchanges the code at Google with the app credentials', async () => {
    const fetchMock = googleAnswers(idToken());
    const { state, stateCookie } = await start();

    await request(app).get(`${CALLBACK}?code=codigo-1&state=${state}`).set('Cookie', stateCookie);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    const body = new URLSearchParams(String(init.body));
    expect(Object.fromEntries(body)).toMatchObject({
      code: 'codigo-1',
      client_id: GOOGLE.clientId,
      client_secret: GOOGLE.clientSecret,
      grant_type: 'authorization_code',
    });
    expect(body.get('redirect_uri')).toMatch(/\/api\/auth\/google\/callback$/);
  });

  it('opens the same account on the next Google login', async () => {
    const first = await whoAmI(sessionOf(await finish(idToken())));
    const second = await whoAmI(sessionOf(await finish(idToken())));

    expect(second.user.id).toBe(first.user.id);
  });

  it('picks a free username when the e-mail name is taken', async () => {
    await request(app).post('/api/auth/register').send({ username: 'mike.silva', password: 'senha-longa-1' });

    const me = await whoAmI(sessionOf(await finish(idToken())));

    expect(me.user.username).toBe('mike.silva2');
  });

  it('links Google to the account already logged in, keeping its data', async () => {
    const register = await request(app).post('/api/auth/register').send({ username: 'mike', password: 'senha-longa-1' });
    const passwordSession = sessionOf(register);

    const link = await finish(idToken(), passwordSession);
    expect(link.headers.location).toBe('/#/perfil');

    const viaGoogle = await whoAmI(sessionOf(await finish(idToken())));
    expect(viaGoogle.user).toEqual(register.body.user);
    const profile = await request(app).get('/api/auth/profile').set('Cookie', sessionOf(link));
    expect(profile.body.google_linked).toBe(true);
  });

  it('refuses to link a Google account that already belongs to someone else', async () => {
    await finish(idToken());
    const other = await request(app).post('/api/auth/register').send({ username: 'outra', password: 'senha-longa-1' });

    const res = await finish(idToken(), sessionOf(other));

    expect(res.headers.location).toBe('/?google=em-uso#/perfil');
    const profile = await request(app).get('/api/auth/profile').set('Cookie', sessionOf(other));
    expect(profile.body.google_linked).toBe(false);
  });

  it('does not let a Google-only account log in with a password', async () => {
    await finish(idToken());

    for (const password of ['', '!', 'x']) {
      expect((await request(app).post('/api/auth/login').send({ username: 'mike.silva', password })).status).not.toBe(200);
    }
  });

  describe('rejects the callback without opening a session', () => {
    const rejected = (res: request.Response) => {
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/?login=google-erro');
      expect(cookieValue(res, 'freyr_session')).toBeUndefined();
    };

    it('when the state does not match the one this browser started with', async () => {
      const fetchMock = googleAnswers(idToken());
      const { stateCookie } = await start();

      rejected(await request(app).get(`${CALLBACK}?code=codigo-1&state=forjado`).set('Cookie', stateCookie));
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('when there is no state cookie', async () => {
      const { state } = await start();
      rejected(await request(app).get(`${CALLBACK}?code=codigo-1&state=${state}`));
    });

    it('when the person cancels at Google', async () => {
      const { state, stateCookie } = await start();
      rejected(await request(app).get(`${CALLBACK}?error=access_denied&state=${state}`).set('Cookie', stateCookie));
    });

    it('when the token was issued to another app', async () => {
      rejected(await finish(idToken({ aud: 'outro-app' })));
    });

    it('when the token was not issued by Google', async () => {
      rejected(await finish(idToken({ iss: 'https://evil.example' })));
    });

    it('when the token has expired', async () => {
      rejected(await finish(idToken({ exp: Math.floor(Date.now() / 1000) - 10 })));
    });

    it('when Google has not verified the e-mail', async () => {
      rejected(await finish(idToken({ email_verified: false })));
    });

    it('when Google refuses the code', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"invalid_grant"}', { status: 400 })));
      const { state, stateCookie } = await start();
      rejected(await request(app).get(`${CALLBACK}?code=velho&state=${state}`).set('Cookie', stateCookie));
    });
  });
});

describe('login with Google when it is not configured', () => {
  it('hides the button and the routes', async () => {
    const app = createApp({
      db: await DatabaseService.connect({ url: ':memory:' }),
      ai: new AIService({ apiKey: '', apiUrl: '', model: '' }),
      logRequests: false,
    });

    expect((await request(app).get('/api/health')).body.googleLogin).toBe(false);
    expect((await request(app).get('/api/auth/google')).status).toBe(404);
    expect((await request(app).get(`${CALLBACK}?code=x&state=y`)).status).toBe(404);
  });
});
