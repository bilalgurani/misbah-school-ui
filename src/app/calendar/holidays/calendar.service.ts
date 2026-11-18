import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type HolidayType = 'PUBLIC' | 'GOVERNMENT' | 'SCHOOL' | 'OTHER';

export interface Holiday {
  id: number;
  date: string;
  name: string;
  type: HolidayType;
}

export interface NewHoliday {
  date: string;
  name: string;
  type: HolidayType;
}

export interface WorkingDaysSummary {
  academicYearId: number;
  academicYear: string;
  startDate: string;
  endDate: string;
  trackingStartDate: string;
  totalDays: number;
  weeklyOffDays: number;
  holidays: number;
  workingDaysTotal: number;
  workingDaysElapsed: number;
  daysAttendanceTaken: number;
  daysAttendanceMissing: number;
  missingDates: string[];
}

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/holidays`;

  getSummary(academicYearId?: number): Observable<WorkingDaysSummary> {
    let params = new HttpParams();
    if (academicYearId) {
      params = params.set('academicYearId', academicYearId);
    }
    return this.http.get<WorkingDaysSummary>(`${this.apiUrl}/summary`, { params });
  }

  getHolidays(from: string, to: string): Observable<Holiday[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<Holiday[]>(this.apiUrl, { params });
  }

  create(holiday: NewHoliday): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.apiUrl, holiday);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
