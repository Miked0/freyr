import type { Expense } from './finance';

/** What a history deletion takes: every imported entry, the months between two keys, or chosen files. */
export type ImportScope =
  | { kind: 'all' }
  | { kind: 'period'; from: string; to: string }
  | { kind: 'files'; files: string[] };

const imported = (expenses: Expense[]) => expenses.filter(e => e.source_file);

/** The imported entries the scope removes. Entries typed by hand never are. */
export function entriesInScope(expenses: Expense[], scope: ImportScope): Expense[] {
  const pool = imported(expenses);
  if (scope.kind === 'all') return pool;
  if (scope.kind === 'period') {
    const [from, to] = scope.from <= scope.to ? [scope.from, scope.to] : [scope.to, scope.from];
    return pool.filter(e => e.date.slice(0, 7) >= from && e.date.slice(0, 7) <= to);
  }
  const files = new Set(scope.files);
  return pool.filter(e => files.has(e.source_file!));
}

/** How many entries go and how many statements disappear entirely with them. */
export function scopeImpact(expenses: Expense[], scope: ImportScope): { entries: number; files: number } {
  const doomed = entriesInScope(expenses, scope);
  const ids = new Set(doomed.map(e => e.id));
  const left = new Set(imported(expenses).filter(e => !ids.has(e.id)).map(e => e.source_file));
  const gone = new Set(doomed.map(e => e.source_file).filter(name => !left.has(name)));
  return { entries: doomed.length, files: gone.size };
}

/** Months (YYYY-MM, oldest first) that have imported entries. */
export function importedMonths(expenses: Expense[]): string[] {
  return [...new Set(imported(expenses).map(e => e.date.slice(0, 7)))].sort();
}
