import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { AttendanceTrend, ClassAttendanceDay, DashboardStats } from "../models/dashboard.models";
import { Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard/stats`;

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(this.apiUrl);
  }

  getAttendanceTrend(months = 6): Observable<AttendanceTrend[]> {
    return this.http.get<AttendanceTrend[]>(`${environment.apiUrl}/dashboard/attendance-trend`, { params: { months } });
  }

  getClassAttendance(): Observable<ClassAttendanceDay> {
    return this.http.get<ClassAttendanceDay>(`${environment.apiUrl}/dashboard/class-attendance`);
  }
}