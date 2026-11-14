import { AttendanceRecordDto, ClassSection, StudentSummaryDto } from '../../attendance/models/attendance.models';

// Raw data collected for one class section on the selected date.
export interface SectionAttendanceData {
  section: ClassSection;
  roster: StudentSummaryDto[];
  records: AttendanceRecordDto[];
  failed: boolean;
}

export interface ClassReportRow {
  classSectionId: number;
  displayName: string;
  marked: boolean;
  failed: boolean;
  enrolled: number;
  present: number;
  late: number;
  absent: number;
  // Percentage of students who attended (present + late); null when attendance is not marked.
  attendancePct: number | null;
}

export interface AbsenteeRow {
  studentId: number;
  name: string;
  rollNo: number | string;
  className: string;
  status: 'ABSENT' | 'LATE';
}

export interface GenderReportRow {
  label: string;
  total: number;
  attended: number;
  absent: number;
  attendancePct: number | null;
}

export interface TeacherAbsenteeRow {
  teacherId: number;
  name: string;
  employeeId: string;
  status: string;
}

export interface StaffReport {
  available: boolean;
  totalTeachers: number;
  marked: boolean;
  present: number;
  late: number;
  absent: number;
  attendancePct: number | null;
  absentees: TeacherAbsenteeRow[];
}

export interface AttendanceReport {
  date: string;
  generatedAt: Date;
  totalSections: number;
  markedSections: number;
  pendingSections: ClassReportRow[];
  failedSections: ClassReportRow[];
  totalEnrolled: number;
  markedStudents: number;
  present: number;
  late: number;
  absent: number;
  attendancePct: number | null;
  genders: GenderReportRow[];
  classRows: ClassReportRow[];
  bestClass: ClassReportRow | null;
  lowestClass: ClassReportRow | null;
  lowAttendanceClasses: ClassReportRow[];
  absentees: AbsenteeRow[];
  staff: StaffReport;
}
