import { attendanceRange } from './progress-card.data';

describe('attendanceRange', () => {
  const year = { startDate: '2026-06-01', endDate: '2027-03-31' };

  it('runs to today while the year is still going', () => {
    expect(attendanceRange(year, '2026-11-19')).toEqual({ from: '2026-06-01', to: '2026-11-19' });
  });

  it('stops at the end date once the year has finished', () => {
    expect(attendanceRange(year, '2027-08-01')).toEqual({ from: '2026-06-01', to: '2027-03-31' });
  });

  it('never ends before it starts, even for a year that has not begun', () => {
    expect(attendanceRange(year, '2026-05-01')).toEqual({ from: '2026-06-01', to: '2026-06-01' });
  });
});
