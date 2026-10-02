import { toCsv, type Expense } from '@/lib/finance';
import { downloadText, todayStamp } from '@/lib/download';

/** Downloads every entry as a CSV that Excel opens as UTF-8, or returns undefined when there is nothing to export. */
export function csvExporter(expenses: Expense[]): (() => void) | undefined {
  if (expenses.length === 0) return undefined;
  return () => downloadText(`freyr-${todayStamp()}.csv`, '﻿' + toCsv(expenses), 'text/csv;charset=utf-8');
}
