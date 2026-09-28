import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Router, type Request, type RequestHandler } from 'express';

const COOKIE = 'freyr_session';
const SESSION_DAYS = 30;
const FAILED_LOGIN_DELAY_MS = 500;

interface AuthOptions {
  password?: string;
  secureCookies?: boolean;
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

export function createAuth({ password, secureCookies = false }: AuthOptions) {
  // Deriving the signing key from the password means changing it logs every session out.
  const signingKey = password ? sha256(`freyr-session:${password}`) : undefined;

  const sign = (expiresAt: number) => createHmac('sha256', signingKey!).update(String(expiresAt)).digest('base64url');

  const isAuthenticated = (req: Request): boolean => {
    if (!signingKey) return true;
    const token = readCookie(req, COOKIE);
    const [expiresAt, signature] = token?.split('.') ?? [];
    if (!expiresAt || !signature || Number(expiresAt) < Date.now()) return false;
    return safeEqual(Buffer.from(signature), Buffer.from(sign(Number(expiresAt))));
  };

  const cookie = (value: string, maxAgeSeconds: number) =>
    `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureCookies ? '; Secure' : ''}`;

  const requireSession: RequestHandler = (req, res, next) => {
    if (isAuthenticated(req)) return next();
    res.status(401).json({ error: 'Faça login para continuar.' });
  };

  const router = Router();

  router.get('/session', (req, res) => {
    res.json({ required: Boolean(signingKey), authenticated: isAuthenticated(req) });
  });

  router.post('/login', async (req, res) => {
    if (!signingKey) return res.json({ authenticated: true });
    const attempt = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!safeEqual(sha256(attempt), sha256(password!))) {
      await new Promise(resolve => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
      return res.status(401).json({ error: 'Senha incorreta.' });
    }
    const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
    res.setHeader('Set-Cookie', cookie(`${expiresAt}.${sign(expiresAt)}`, SESSION_DAYS * 24 * 60 * 60));
    res.json({ authenticated: true });
  });

  router.post('/logout', (req, res) => {
    res.setHeader('Set-Cookie', cookie('', 0));
    res.json({ authenticated: false });
  });

  return { router, requireSession };
}
