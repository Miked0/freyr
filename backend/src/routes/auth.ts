import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Router, type Request, type RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../services/database.service';

const COOKIE = 'freyr_session';
const SESSION_DAYS = 30;
const FAILED_LOGIN_DELAY_MS = 500;
const BCRYPT_ROUNDS = 12;

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

function sign(userId: string, expiresAt: number, signingKey: Buffer): string {
  return createHmac('sha256', signingKey).update(`${userId}.${expiresAt}`).digest('base64url');
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
    if (!safeEqual(Buffer.from(signature), Buffer.from(sign(userId, Number(expiresAt), signingKey)))) return null;
    
    const user = await db.getUserById(userId);
    if (!user) return null;
    
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

  const router = Router();

  router.get('/session', async (req, res) => {
    const user = await isAuthenticated(req);
    res.json({ authenticated: !!user, user: user ? { id: user.id, username: user.username } : null });
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

    try {
      const existingUser = await db.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: 'Nome de usuário já existe.' });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const userId = await db.createUser(username, passwordHash);
      await db.seedDefaultCategoriesForUser(userId);

      const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
      const token = `${userId}.${expiresAt}.${sign(userId, expiresAt, signingKey)}`;
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

    try {
      const user = await db.getUserByUsername(username);
      const validPassword = user ? await bcrypt.compare(password, user.password_hash) : false;
      if (!user || !validPassword) {
        await new Promise(resolve => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
        return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
      }

      const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
      const token = `${user.id}.${expiresAt}.${sign(user.id, expiresAt, signingKey)}`;
      res.setHeader('Set-Cookie', createCookie(token, SESSION_DAYS * 24 * 60 * 60, secureCookies));
      
      res.json({ authenticated: true, user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro ao fazer login.' });
    }
  });

  router.post('/logout', (req, res) => {
    res.setHeader('Set-Cookie', createCookie('', 0, secureCookies));
    res.json({ authenticated: false });
  });

  return { router, requireSession };
}