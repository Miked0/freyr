import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../backend/src/app';
import { databaseConfigFromEnv } from '../backend/src/config';
import { DatabaseService } from '../backend/src/services/database.service';
import { AIService } from '../backend/src/services/ai.service';

// Fail closed: a deployed instance without a password would expose financial data.
const ready = (async () => {
  if (!process.env.APP_PASSWORD) throw new Error('Defina a variável APP_PASSWORD na Vercel.');
  if (!process.env.TURSO_DATABASE_URL) throw new Error('Defina a variável TURSO_DATABASE_URL na Vercel.');
  return createApp({
    db: await DatabaseService.connect(databaseConfigFromEnv()),
    ai: new AIService(),
    password: process.env.APP_PASSWORD,
    secureCookies: true,
    logRequests: false,
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
