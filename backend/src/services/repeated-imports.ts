export interface ImportedRow {
  id: string;
  import_key: string | null;
  source_file: string | null;
  created_at: string;
}

// One upload saves its rows one by one inside a 60 s function, so rows of the same file this close belong to it.
const SAME_UPLOAD_SECONDS = 120;

const seconds = (createdAt: string) => Date.parse(createdAt.replace(' ', 'T') + 'Z') / 1000;

/**
 * Finds the copies left by importing the same transactions more than once (before uploads skipped them).
 * For each import key it keeps as many rows as the upload that had the most of them, so identical purchases
 * listed on one statement stay, and flags the newer extras. Transactions typed in by hand are never flagged.
 */
export function findRepeatedImports(rows: ImportedRow[]): string[] {
  const byKey = new Map<string, ImportedRow[]>();
  for (const row of rows) {
    if (row.import_key === null || row.source_file === null) continue;
    byKey.set(row.import_key, [...(byKey.get(row.import_key) ?? []), row]);
  }

  const repeated: ImportedRow[] = [];
  for (const group of byKey.values()) {
    if (group.length < 2) continue;
    const ordered = [...group].sort((a, b) => seconds(a.created_at) - seconds(b.created_at));

    const uploads: { file: string; last: number; size: number }[] = [];
    for (const row of ordered) {
      const at = seconds(row.created_at);
      const upload = uploads.find(u => u.file === row.source_file && at - u.last <= SAME_UPLOAD_SECONDS);
      if (upload) {
        upload.last = at;
        upload.size++;
      } else {
        uploads.push({ file: row.source_file!, last: at, size: 1 });
      }
    }

    const keep = Math.max(...uploads.map(u => u.size));
    repeated.push(...ordered.slice(keep));
  }

  return repeated.sort((a, b) => seconds(a.created_at) - seconds(b.created_at)).map(r => r.id);
}
