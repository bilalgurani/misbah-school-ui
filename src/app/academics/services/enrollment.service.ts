// enrollment.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StudentEnrollment, PromotionRequestDto } from '../models/enrollment.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}`;

  getHistory(studentId: number): Observable<StudentEnrollment[]> {
    return this.http.get<StudentEnrollment[]>(`${this.apiUrl}/students/${studentId}/enrollments`);
  }

  promoteOrDetain(request: PromotionRequestDto): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/enrollments/promote`, request);
  }

  getActiveEnrollmentsBySection(sectionId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/enrollments/section/${sectionId}/active`);
  }
}