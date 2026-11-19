// enrollment.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StudentEnrollment, PromotionRequestDto, SectionMove } from '../models/enrollment.model';
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

  // Moves students to another section of the current year. One call handles a single student or many.
  moveStudents(moves: SectionMove[]): Observable<{ moved: number }> {
    return this.http.post<{ moved: number }>(`${this.apiUrl}/enrollments/move`, { moves });
  }

  getNextRollNo(sectionId: number): Observable<{ rollNo: number }> {
    return this.http.get<{ rollNo: number }>(`${this.apiUrl}/enrollments/section/${sectionId}/next-roll-no`);
  }
}