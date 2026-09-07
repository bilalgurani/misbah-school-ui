// academic-year.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AcademicYear } from '../models/academic-year.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AcademicYearService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/academic-years`;

  getAll(): Observable<AcademicYear[]> {
    return this.http.get<AcademicYear[]>(this.apiUrl);
  }

  getCurrent(): Observable<AcademicYear> {
    return this.http.get<AcademicYear>(`${this.apiUrl}/current`);
  }

  create(year: AcademicYear): Observable<number> {
    return this.http.post<number>(this.apiUrl, year);
  }

  setCurrent(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/set-current`, {});
  }
}