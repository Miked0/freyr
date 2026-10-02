import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../backend/src/app';
import { databaseConfigFromEnv } from '../backend/src/config';
import { DatabaseService } from '../backend/src/services/database.service';
import { AIService } from '../backend/src/services/ai.service';

const ready = (async () => {
  // Fail closed: without a secret the session cookies would be signed with a publicly known key.
  if (!process.env.SESSION_SECRET) throw new Error('Defina a variável SESSION_SECRET na Vercel.');
  if (!process.env.TURSO_DATABASE_URL) throw new Error('Defina a variável TURSO_DATABASE_URL na Vercel.');
  // Same reasoning: without it the per-user data keys would be sealed with a publicly known key.
  if (!process.env.DATA_ENCRYPTION_KEY) throw new Error('Defina a variável DATA_ENCRYPTION_KEY na Vercel.');
  return createApp({
    db: await DatabaseService.connect(databaseConfigFromEnv(), { masterKey: process.env.DATA_ENCRYPTION_KEY }),
    ai: new AIService(),
    secureCookies: true,
    sessionSecret: process.env.SESSION_SECRET,
    logRequests: false,
    trustProxy: true,
  });
})();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await ready;
    app(req as any, res as any);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: `Servidor não configurado: ${(error as Error).message}` }));
  }
}
