export type TrendDirection = 'up' | 'down' | 'flat';

export interface AttendanceTrend {
  direction: TrendDirection;
  // Percentage points gained (positive) or lost (negative) compared with the previous period.
  delta: number;
}

export interface StudentAttendanceStat {
  pct: number | null;
  trend: AttendanceTrend | null;
  // True when pct comes from last month because nothing is marked yet this month.
  fromPreviousMonth: boolean;
}

// Changes smaller than this many points are shown as steady rather than as a rise or a drop.
const STEADY_BAND = 1;

export function computeTrend(current: number | null | undefined, previous: number | null | undefined): AttendanceTrend | null {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  const delta = Math.round((current - previous) * 10) / 10;
  if (Math.abs(delta) < STEADY_BAND) return { direction: 'flat', delta };
  return { direction: delta > 0 ? 'up' : 'down', delta };
}

export function toMonthKey(date: string | Date): string {
  if (typeof date === 'string') return date.slice(0, 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function previousMonthKey(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  return mon === 1 ? `${year - 1}-12` : `${year}-${String(mon - 1).padStart(2, '0')}`;
}

// Falls back to last month's figure, without a trend, while the current month has no marks yet.
export function buildStat(current: number | null | undefined, previous: number | null | undefined): StudentAttendanceStat {
  const cur = current ?? null;
  const prev = previous ?? null;
  if (cur !== null) return { pct: cur, trend: computeTrend(cur, prev), fromPreviousMonth: false };
  return { pct: prev, trend: null, fromPreviousMonth: prev !== null };
}

// Compares the two most recent months that actually have attendance recorded.
export function trendFromMonths(months: { attendancePct: number | null }[]): { pct: number | null; trend: AttendanceTrend | null } {
  const recorded = months.filter(m => m.attendancePct !== null && m.attendancePct !== undefined);
  const latest = recorded.at(-1)?.attendancePct ?? null;
  const before = recorded.at(-2)?.attendancePct ?? null;
  return { pct: latest, trend: computeTrend(latest, before) };
}
