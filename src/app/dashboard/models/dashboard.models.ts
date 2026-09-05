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