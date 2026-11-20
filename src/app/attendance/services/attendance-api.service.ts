import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { AttendanceMarker, AttendanceRecordDto, ClassSection, MarkAttendanceRequest, MarkTeacherAttendanceRequest, StudentSummaryDto, TeacherAttendanceRecordDto, TeacherSummaryDto } from "../models/attendance.models";
import { environment } from "../../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class AttendanceApiService {
    private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}`;

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

  getMarkers(date: string): Observable<AttendanceMarker[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<AttendanceMarker[]>(`${this.baseUrl}/attendance/markers`, { params });
  }

  saveAttendance(request: MarkAttendanceRequest): Observable<AttendanceMarker> {
    return this.http.post<AttendanceMarker>(`${this.baseUrl}/attendance`, request);
  }

  clearAttendance(classSectionId: number, date: string): Observable<{ removed: number }> {
    const params = new HttpParams().set('classSectionId', classSectionId).set('date', date);
    return this.http.delete<{ removed: number }>(`${this.baseUrl}/attendance`, { params });
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