import path from 'path';
import type { DatabaseConfig } from './services/database.service';

export function databaseConfigFromEnv(): DatabaseConfig {
  if (process.env.TURSO_DATABASE_URL) {
    return { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN };
  }
  const file = process.env.DB_PATH || path.resolve(__dirname, '../database/expenses.db');
  return { url: `file:${file.replace(/\\/g, '/')}` };
}
