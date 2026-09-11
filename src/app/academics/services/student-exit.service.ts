// student-exit.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StudentExitRecord, StudentExitRequestDto } from '../models/student-exit.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StudentExitService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/students`;

  recordExit(studentId: number, dto: StudentExitRequestDto): Observable<number> {
    return this.http.post<number>(`${this.apiUrl}/${studentId}/exit`, dto);
  }

  getExitRecords(studentId: number): Observable<StudentExitRecord[]> {
    return this.http.get<StudentExitRecord[]>(`${this.apiUrl}/${studentId}/exit-records`);
  }

  getAllExitRecords(): Observable<StudentExitRecord[]> {
    return this.http.get<StudentExitRecord[]>(`${this.apiUrl}/exit-records`);
  }
}