import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type AttendanceMark = 'PRESENT' | 'ABSENT' | 'LATE';

export interface MonthlyDay {
  date: string;
  working: boolean;
  closureReason: string | null;
}

export interface MonthlyStudentRow {
  studentId: number;
  rollNo: number | string | null;
  name: string;
  present: number;
  absent: number;
  late: number;
  markedDays: number;
  attendancePct: number | null;
  statuses: Record<string, AttendanceMark>;
}

export interface MonthlyAttendanceResponse {
  month: string;
  classSectionId: number;
  className: string;
  days: MonthlyDay[];
  workingDays: number;
  daysAttendanceTaken: number;
  students: MonthlyStudentRow[];
  summary: {
    totalStudents: number;
    averageAttendancePct: number | null;
  };
}

export interface StudentMonthRow {
  month: string;
  workingDays: number;
  markedDays: number;
  present: number;
  absent: number;
  late: number;
  attendancePct: number | null;
}

export interface StudentAttendanceResponse {
  studentId: number;
  name: string;
  rollNo: number | string | null;
  className: string;
  from: string;
  to: string;
  workingDays: number;
  daysAttendanceTaken: number;
  present: number;
  absent: number;
  late: number;
  markedDays: number;
  unmarkedWorkingDays: number;
  attendancePct: number | null;
  months: StudentMonthRow[];
  absentDates: { date: string; status: AttendanceMark }[];
}

@Injectable({ providedIn: 'root' })
export class AttendanceRegisterService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reports/attendance`;

  getMonthly(month: string, classSectionId: number): Observable<MonthlyAttendanceResponse> {
    const params = new HttpParams().set('month', month).set('classSectionId', classSectionId);
    return this.http.get<MonthlyAttendanceResponse>(`${this.apiUrl}/monthly`, { params });
  }

  getStudent(studentId: number, from: string, to: string): Observable<StudentAttendanceResponse> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<StudentAttendanceResponse>(`${this.apiUrl}/student/${studentId}`, { params });
  }
}
