import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { AttendanceRecordDto, ClassSection, MarkAttendanceRequest, MarkTeacherAttendanceRequest, StudentSummaryDto, TeacherAttendanceRecordDto, TeacherSummaryDto } from "../models/attendance.models";

@Injectable({
  providedIn: 'root'
})
export class AttendanceApiService {
    private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api';

  // --- Student Attendance Operations ---

  getClassSections(): Observable<ClassSection[]> {
    return this.http.get<ClassSection[]>(`${this.baseUrl}/class-sections`);
  }

  getStudentsBySection(classSectionId: number): Observable<StudentSummaryDto[]> {
    const params = new HttpParams().set('classSectionId', classSectionId);
    return this.http.get<StudentSummaryDto[]>(`${this.baseUrl}/students`, { params });
  }

  getAttendance(classSectionId: number, date: string): Observable<AttendanceRecordDto[]> {
    const params = new HttpParams()
      .set('classSectionId', classSectionId)
      .set('date', date);
    return this.http.get<AttendanceRecordDto[]>(`${this.baseUrl}/attendance`, { params });
  }

  saveAttendance(request: MarkAttendanceRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/attendance`, request);
  }

  // --- Teacher Attendance Operations ---

  getTeacherAttendance(date: string): Observable<TeacherAttendanceRecordDto[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<TeacherAttendanceRecordDto[]>(`${this.baseUrl}/teacher-attendance`, { params });
  }

  getAllTeachers(): Observable<TeacherSummaryDto[]> {
    return this.http.get<TeacherSummaryDto[]>(`${this.baseUrl}/teachers`);
  }

  saveTeacherAttendance(request: MarkTeacherAttendanceRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/teacher-attendance`, request);
  }
}