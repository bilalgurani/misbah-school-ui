import type { Routes } from '@angular/router';
import { of } from 'rxjs';
import { CalendarService, type WorkingDaysSummary } from '../calendar/holidays/calendar.service';
import { Dashboard } from './dashboard';
import type {
  AttendanceTrend,
  ClassAttendance,
  ClassAttendanceDay,
  DashboardStats,
  PendingClassDto,
} from './models/dashboard.models';
import { DashboardService } from './services/dashboard-api.service';

const attendanceRate = (count: number, total: number) => Math.round(count * 1000 / total) / 10;

function marked(
  classSectionId: number, className: string, total: number, present: number, late: number,
): ClassAttendance {
  return {
    classSectionId, className, total, present, late,
    absent: total - present - late,
    marked: true,
    percentage: attendanceRate(present + late, total),
  };
}

const prePrimary = [
  marked(1, 'Nursery A', 31, 29, 1),
  marked(2, 'LKG A', 34, 32, 1),
  marked(3, 'UKG A', 36, 32, 2),
];

const markedClasses = [
  ...prePrimary,
  marked(4, 'Class 1 A', 37, 31, 2),
  marked(5, 'Class 2 A', 38, 36, 1),
  marked(6, 'Class 3 A', 35, 24, 1),
  marked(7, 'Class 4 A', 39, 36, 1),
  marked(8, 'Class 5 A', 36, 33, 1),
];

const pendingClasses: PendingClassDto[] = [
  { classSectionId: 9, className: 'Class 1', sectionName: 'B', totalStudents: 32 },
  { classSectionId: 10, className: 'Class 3', sectionName: 'B', totalStudents: 34 },
  { classSectionId: 11, className: 'Class 5', sectionName: 'B', totalStudents: 38 },
];

const markedTotal = markedClasses.reduce((sum, c) => sum + c.total, 0);
const totalStudents = markedTotal + pendingClasses.reduce((sum, c) => sum + c.totalStudents, 0);
const prePrimaryStudents = prePrimary.reduce((sum, c) => sum + c.total, 0);
const totalBoys = 203;

const stats: DashboardStats = {
  totalStudents,
  prePrimaryStudents,
  primaryStudents: totalStudents - prePrimaryStudents,
  totalBoys,
  totalGirls: totalStudents - totalBoys,
  totalTeachers: 27,
  studentAttendancePercentage: attendanceRate(
    markedClasses.reduce((sum, c) => sum + c.present + c.late, 0),
    markedTotal,
  ),
  pendingClassAttendanceCount: pendingClasses.length,
  pendingClasses,
};

const trend: AttendanceTrend[] = [
  { period: '2026-06', studentAttendancePercentage: 89.8, teacherAttendancePercentage: 96.3 },
  { period: '2026-07', studentAttendancePercentage: 94.2, teacherAttendancePercentage: 97.8 },
  { period: '2026-08', studentAttendancePercentage: 90.6, teacherAttendancePercentage: 95.1 },
  { period: '2026-09', studentAttendancePercentage: 95.4, teacherAttendancePercentage: 98.2 },
  { period: '2026-10', studentAttendancePercentage: 91.7, teacherAttendancePercentage: 96.4 },
  { period: '2026-11', studentAttendancePercentage: 96.1, teacherAttendancePercentage: 98.7 },
];

const today: ClassAttendanceDay = {
  date: '2026-11-23',
  working: true,
  closureReason: null,
  classes: [
    ...markedClasses,
    ...pendingClasses.map(c => ({
      classSectionId: c.classSectionId,
      className: `${c.className} ${c.sectionName}`,
      total: c.totalStudents,
      present: 0, late: 0, absent: 0, marked: false, percentage: null,
    })),
  ],
};

const yearSummary: WorkingDaysSummary = {
  academicYearId: 1,
  academicYear: '2026-27',
  startDate: '2026-06-01',
  endDate: '2027-03-31',
  trackingStartDate: '2026-06-01',
  totalDays: 304,
  weeklyOffDays: 86,
  holidays: 18,
  workingDaysTotal: 200,
  workingDaysElapsed: 116,
  daysAttendanceTaken: 114,
  daysAttendanceMissing: 2,
  missingDates: ['2026-08-19', '2026-10-07'],
};

const dashboardApi: Pick<DashboardService, 'getDashboardStats' | 'getAttendanceTrend' | 'getClassAttendance'> = {
  getDashboardStats: () => of(stats),
  getAttendanceTrend: (months = 6) => of(trend.slice(-months)),
  getClassAttendance: () => of(today),
};

const calendarApi: Pick<CalendarService, 'getSummary'> = {
  getSummary: () => of(yearSummary),
};

export const dashboardSampleRoutes: Routes = [{
  path: '',
  pathMatch: 'full',
  component: Dashboard,
  data: { mockDashboard: true },
  providers: [
    { provide: DashboardService, useValue: dashboardApi },
    { provide: CalendarService, useValue: calendarApi },
  ],
}];
