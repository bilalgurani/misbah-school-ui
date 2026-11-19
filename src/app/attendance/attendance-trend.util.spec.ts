import { buildStat, computeTrend, previousMonthKey, trendFromMonths } from './attendance-trend.util';

describe('attendance trend', () => {
  it('reports rises and drops and treats tiny changes as steady', () => {
    expect(computeTrend(92, 88)).toEqual({ direction: 'up', delta: 4 });
    expect(computeTrend(70, 85.5)).toEqual({ direction: 'down', delta: -15.5 });
    expect(computeTrend(90.4, 90)?.direction).toBe('flat');
  });

  it('has no trend when either month has no data', () => {
    expect(computeTrend(null, 80)).toBeNull();
    expect(computeTrend(80, null)).toBeNull();
  });

  it('rolls the previous month back over a year boundary', () => {
    expect(previousMonthKey('2026-01')).toBe('2025-12');
    expect(previousMonthKey('2026-11')).toBe('2026-10');
  });

  it('falls back to last month without an arrow when this month is unmarked', () => {
    expect(buildStat(null, 88)).toEqual({ pct: 88, trend: null, fromPreviousMonth: true });
    expect(buildStat(null, null)).toEqual({ pct: null, trend: null, fromPreviousMonth: false });
    expect(buildStat(95, 90).trend?.direction).toBe('up');
  });

  it('uses the two latest recorded months, skipping empty ones', () => {
    const months = [{ attendancePct: 80 }, { attendancePct: 90 }, { attendancePct: null }];
    expect(trendFromMonths(months)).toEqual({ pct: 90, trend: { direction: 'up', delta: 10 } });
    expect(trendFromMonths([{ attendancePct: 90 }])).toEqual({ pct: 90, trend: null });
  });
});
