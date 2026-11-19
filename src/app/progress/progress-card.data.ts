import { AcademicYear } from '../academics/models/academic-year.model';
import { ReportCardData } from '../exams/exam.service';
import { StudentAttendanceResponse } from '../reports/services/attendance-register.service';
import { StudentAssessment } from './progress.models';

export const DEFAULT_SCHOOL_NAME = 'Sana Misbah School';

/** Everything one printed progress card needs. A part that failed to load is null with its flag set. */
export interface ProgressCardData {
  studentId: number;
  name: string;
  rollNo: number | string | null;
  className: string;
  fatherName: string | null;
  schoolName: string | null;
  yearName: string;
  term: number;
  academics: ReportCardData | null;
  attendance: StudentAttendanceResponse | null;
  assessment: StudentAssessment | null;
  academicsFailed: boolean;
  attendanceFailed: boolean;
}

// Attendance for a card runs from the start of the year up to today, or the year's end if it has finished.
export function attendanceRange(year: Pick<AcademicYear, 'startDate' | 'endDate'>, today: string): { from: string; to: string } {
  const end = year.endDate && year.endDate < today ? year.endDate : today;
  return { from: year.startDate, to: end < year.startDate ? year.startDate : end };
}
