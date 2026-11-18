export interface DashboardStats {
  totalStudents: number;
  prePrimaryStudents: number;
  primaryStudents: number;
  totalBoys: number;
  totalGirls: number;
  totalTeachers: number;
  studentAttendancePercentage: number;
  pendingClassAttendanceCount: number;
  pendingClasses: PendingClassDto[];
}

export interface PendingClassDto {
  classSectionId: number;
  className: string;
  sectionName: string;
  totalStudents: number;
}

// period is "YYYY-MM"; a percentage is null when nothing was marked that month.
export interface AttendanceTrend {
  period: string;
  studentAttendancePercentage: number | null;
  teacherAttendancePercentage: number | null;
}

// percentage is null while the class has not been marked.
export interface ClassAttendance {
  classSectionId: number;
  className: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  marked: boolean;
  percentage: number | null;
}

export interface ClassAttendanceDay {
  date: string;
  working: boolean;
  closureReason: string | null;
  classes: ClassAttendance[];
}