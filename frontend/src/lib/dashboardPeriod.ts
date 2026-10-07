// What the overview shows when the app opens: the last 30 days or the current month. Kept in this browser.

export type DashboardPeriod = '30d' | 'month';

export const DASHBOARD_PERIOD_KEY = 'freyr:painel';

export function readDashboardPeriod(): DashboardPeriod {
  try {
    return window.localStorage.getItem(DASHBOARD_PERIOD_KEY) === 'month' ? 'month' : '30d';
  } catch {
    return '30d';
  }
}

export function saveDashboardPeriod(period: DashboardPeriod): void {
  try {
    window.localStorage.setItem(DASHBOARD_PERIOD_KEY, period);
  } catch {
    // Not saved; the overview keeps its default.
  }
}

/** YYYY-MM of today, in the browser's time zone. */
export function currentMonthKey(today = new Date()): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}
