import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Router, type Request, type RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import { DatabaseService, type ProfileUpdate } from '../services/database.service';
import { AVATAR_COLORS, type AvatarColor } from '../services/schema';

const COOKIE = 'freyr_session';
const SESSION_DAYS = 30;
const FAILED_LOGIN_DELAY_MS = 500;
const BCRYPT_ROUNDS = 12;
const LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const REGISTRATIONS = 5;
const REGISTRATION_WINDOW_MS = 60 * 60 * 1000;
const DISPLAY_NAME_MAX = 40;
const MONTHLY_BUDGET_MAX = 1_000_000_000;

interface AuthOptions {
  db: DatabaseService;
  secureCookies?: boolean;
  sessionSecret?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; username: string };
    }
  }
}

const sha256 = (value: string) => createHash('sha256').update(value).digest();

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

// The session version is signed but not sent: bumping it in the database revokes older cookies.
function sign(userId: string, expiresAt: number, sessionVersion: number, signingKey: Buffer): string {
  return createHmac('sha256', signingKey).update(`${userId}.${expiresAt}.${sessionVersion}`).digest('base64url');
}

// In-memory, so each serverless instance counts on its own; still caps bursts against one instance.
function createAttemptLimiter(max: number, windowMs: number) {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  return {
    /** Counts an attempt for key; false once key has used up its attempts in the current window. */
    take(key: string): boolean {
      const now = Date.now();
      if (attempts.size > 10_000) {
        for (const [k, entry] of attempts) if (entry.resetAt <= now) attempts.delete(k);
      }
      const entry = attempts.get(key);
      if (!entry || entry.resetAt <= now) {
        attempts.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      entry.count += 1;
      return entry.count <= max;
    },
    reset(key: string) {
      attempts.delete(key);
    },
  };
}

/** Parses a PATCH /profile body; returns the update or the message to answer with 400. */
export function parseProfileUpdate(body: unknown): { update: ProfileUpdate } | { error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Envie os campos do perfil.' };
  const input = body as Record<string, unknown>;
  const allowed = ['display_name', 'avatar_color', 'monthly_budget'];
  const unknown = Object.keys(input).filter(key => !allowed.includes(key));
  if (unknown.length > 0) return { error: `Campo desconhecido: ${unknown.join(', ')}.` };
  if (Object.keys(input).length === 0) return { error: 'Nada para atualizar.' };

  const update: ProfileUpdate = {};
  if ('display_name' in input) {
    const name = input.display_name;
    if (name === null) update.display_name = null;
    else if (typeof name !== 'string') return { error: 'O nome de exibição deve ser um texto.' };
    else {
      const trimmed = name.trim();
      if (trimmed.length < 1 || trimmed.length > DISPLAY_NAME_MAX) {
        return { error: `O nome de exibição deve ter de 1 a ${DISPLAY_NAME_MAX} caracteres.` };
      }
      update.display_name = trimmed;
    }
  }
  if ('avatar_color' in input) {
    if (!AVATAR_COLORS.includes(input.avatar_color as AvatarColor)) return { error: 'Cor do avatar inválida.' };
    update.avatar_color = input.avatar_color as AvatarColor;
  }
  if ('monthly_budget' in input) {
    const budget = input.monthly_budget;
    if (budget === null) update.monthly_budget = null;
    else if (typeof budget !== 'number' || !Number.isFinite(budget) || budget < 0 || budget > MONTHLY_BUDGET_MAX) {
      return { error: 'A meta de gasto mensal deve ser um valor a partir de zero.' };
    } else update.monthly_budget = Math.round(budget * 100) / 100;
  }
  return { update };
}

function createCookie(value: string, maxAgeSeconds: number, secureCookies: boolean): string {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureCookies ? '; Secure' : ''}`;
}

export function createAuth({ db, secureCookies = false, sessionSecret }: AuthOptions) {
  // The fallback key is for local development only; api/index.ts refuses to start without SESSION_SECRET.
  const signingKey = sessionSecret ? sha256(sessionSecret) : createHash('sha256').update('freyr-session-signing-key').digest();

  const isAuthenticated = async (req: Request): Promise<{ id: string; username: string } | null> => {
    const token = readCookie(req, COOKIE);
    const [userId, expiresAt, signature] = token?.split('.') ?? [];
    if (!userId || !expiresAt || !signature || Number(expiresAt) < Date.now()) return null;

    const user = await db.getUserById(userId);
    if (!user) return null;
    const expected = sign(userId, Number(expiresAt), Number(user.session_version), signingKey);
    if (!safeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    
    return { id: user.id, username: user.username };
  };

  const requireSession: RequestHandler = async (req, res, next) => {
    const user = await isAuthenticated(req);
    if (user) {
      req.user = user;
      return next();
    }
    res.status(401).json({ error: 'Faça login para continuar.' });
  };

  const loginAttempts = createAttemptLimiter(LOGIN_ATTEMPTS, LOGIN_WINDOW_MS);
  const registrations = createAttemptLimiter(REGISTRATIONS, REGISTRATION_WINDOW_MS);
  const router = Router();

  router.get('/session', async (req, res) => {
    const user = await isAuthenticated(req);
    res.json({ authenticated: !!user, user: user ? { id: user.id, username: user.username } : null });
  });

  router.get('/profile', requireSession, async (req, res) => {
    try {
      const profile = await db.getProfile(req.user!.id);
      if (!profile) return res.status(401).json({ error: 'Faça login para continuar.' });
      res.json(profile);
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ error: 'Erro ao carregar o perfil.' });
    }
  });

  router.patch('/profile', requireSession, async (req, res) => {
    const parsed = parseProfileUpdate(req.body);
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    try {
      const profile = await db.updateProfile(req.user!.id, parsed.update);
      if (!profile) return res.status(401).json({ error: 'Faça login para continuar.' });
      res.json(profile);
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Erro ao salvar o perfil.' });
    }
  });

  router.post('/register', async (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username) {
      return res.status(400).json({ error: 'Nome de usuário é obrigatório.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres.' });
    }
    if (!registrations.take(req.ip ?? 'unknown')) {
      return res.status(429).json({ error: 'Muitos cadastros a partir deste endereço. Tente novamente em uma hora.' });
    }

    try {
      const existingUser = await db.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: 'Nome de usuário já existe.' });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const userId = await db.createUser(username, passwordHash);
      await db.seedDefaultCategoriesForUser(userId);

      const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
      const token = `${userId}.${expiresAt}.${sign(userId, expiresAt, 0, signingKey)}`;
      res.setHeader('Set-Cookie', createCookie(token, SESSION_DAYS * 24 * 60 * 60, secureCookies));
      
      res.json({ authenticated: true, user: { id: userId, username } });
    } catch (error) {
      // Lost a race with a concurrent registration of the same username.
      if (String((error as Error)?.message).includes('UNIQUE constraint failed: users.username')) {
        return res.status(409).json({ error: 'Nome de usuário já existe.' });
      }
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Erro ao criar usuário.' });
    }
  });

  router.post('/login', async (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    }
    const client = req.ip ?? 'unknown';
    if (!loginAttempts.take(client)) {
      return res.status(429).json({ error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' });
    }

    try {
      const user = await db.getUserByUsername(username);
      const validPassword = user ? await bcrypt.compare(password, user.password_hash) : false;
      if (!user || !validPassword) {
        await new Promise(resolve => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
        return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
      }

      loginAttempts.reset(client);
      const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
      const token = `${user.id}.${expiresAt}.${sign(user.id, expiresAt, Number(user.session_version), signingKey)}`;
      res.setHeader('Set-Cookie', createCookie(token, SESSION_DAYS * 24 * 60 * 60, secureCookies));
      
      res.json({ authenticated: true, user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro ao fazer login.' });
    }
  });

  router.delete('/account', requireSession, async (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const client = req.ip ?? 'unknown';
    if (!loginAttempts.take(client)) {
      return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em 15 minutos.' });
    }
    try {
      const user = await db.getUserById(req.user!.id);
      if (!user || !password || !(await bcrypt.compare(password, user.password_hash))) {
        await new Promise(resolve => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
        return res.status(401).json({ error: 'Senha incorreta.' });
      }
      await db.deleteUser(user.id);
      res.setHeader('Set-Cookie', createCookie('', 0, secureCookies));
      res.json({ deleted: true });
    } catch (error) {
      console.error('Account deletion error:', error);
      res.status(500).json({ error: 'Não foi possível excluir a conta.' });
    }
  });

  router.post('/logout', async (req, res) => {
    const user = await isAuthenticated(req);
    if (user) await db.endAllSessions(user.id);
    res.setHeader('Set-Cookie', createCookie('', 0, secureCookies));
    res.json({ authenticated: false });
  });

  return { router, requireSession };
}