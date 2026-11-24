import { Period, Schedule } from './timetable.service';

export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

export const dayShort = (day: number): string => DAY_SHORT[day - 1] ?? '';
export const dayLong = (day: number): string => DAY_LONG[day - 1] ?? '';

/** '14:05' becomes '2:05 PM'. */
export function formatTime(value: string): string {
  const [h, m] = value.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export const timeRange = (start: string, end: string): string => `${formatTime(start)} - ${formatTime(end)}`;

/** The weekdays a period actually runs on: its own list, or every working day of its schedule. */
export function periodDays(period: Period, schedule: Schedule): number[] {
  return (period.days ?? schedule.days).filter(d => schedule.days.includes(d));
}

export function runsOn(period: Period, schedule: Schedule, day: number): boolean {
  return periodDays(period, schedule).includes(day);
}

export { todayIso } from '../shared/utils/date.util';
