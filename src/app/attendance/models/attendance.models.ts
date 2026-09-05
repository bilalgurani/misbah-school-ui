export interface ClassSection {
    id: number;
  levelName: string;
  division: string;
  displayName: string;
}

export interface StudentSummaryDto {
    id: number;
    name: string;
    rollNo: number;
    gender: string;
}

export interface AttendanceRecordDto {
    studentId: number;
    studentName: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE';
    rollNo: number;
}

export interface StudentAttendanceItem {
    id: number;
    studentId: number;
    classSectionId: number;
    date: Date;
    status: AttendanceStatus;
    markedByTeacherId: number;
    createdAt: Date;
}

export enum AttendanceStatus {
    PRESENT,
    ABSENT,
    LATE
}

export interface MarkAttendanceRequest {
    classSectionId: number;
  date: string; // YYYY-MM-DD for Spring Boot @DateTimeFormat
  entries: StudentAttendanceEntry[];
}

export interface LocalStudentUI {
  id: number;
  name: string;
  rollNo: number | string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
}

export interface StudentAttendanceEntry {
    studentId: number;
    status: 'PRESENT' | 'ABSENT' | 'LATE';
}

export interface LocalTeacherUI {
  id: number;
  teacherId: string;
  name: string;
  status: 'PRESENT' | 'ABSENT';
}

export interface MarkTeacherAttendanceRequest {
  date: string;
  entries: { teacherId: number; status: string }[];
}

export interface TeacherAttendanceEntry {
  teacherId: number;
  status: string; // 'PRESENT', 'ABSENT', 'LATE'
}

export interface TeacherAttendanceRecordDto {
  teacherId: number;
  teacherName: string;
  employeeId: string;
  status: string;
}

export interface TeacherSummaryDto {
  id: number;
  name: string;
  teacherId: string;
}
