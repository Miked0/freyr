export interface Importable {
  date: string;
  amount: number;
  description: string;
  type: 'income' | 'expense';
}

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Identifies a transaction as the statement listed it, so uploading the same statement again (or one that
 * overlaps it) can be recognized. Saved with the expense and never updated by edits.
 */
export function importKey(t: Importable): string {
  return `${t.date}|${t.amount.toFixed(2)}|${t.type}|${normalize(t.description)}`;
}

/**
 * Drops the transactions already saved. A key saved n times skips its first n copies in the upload, so
 * two identical purchases on the same day are both kept, and a re-upload of them adds none.
 */
export function splitAlreadyImported<T extends Importable>(transactions: T[], savedCounts: Map<string, number>) {
  const remaining = new Map(savedCounts);
  const fresh: T[] = [];
  for (const t of transactions) {
    const key = importKey(t);
    const left = remaining.get(key) ?? 0;
    if (left > 0) remaining.set(key, left - 1);
    else fresh.push(t);
  }
  return { fresh, duplicates: transactions.length - fresh.length };
}
