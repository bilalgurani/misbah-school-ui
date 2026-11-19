import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ClassCardsResponse, Criterion, CriterionCategory, ManagedCriterion, SaveAssessmentRequest, StudentAssessment,
} from './progress.models';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/progress`;

  getCriteria(): Observable<Criterion[]> {
    return this.http.get<Criterion[]>(`${this.baseUrl}/criteria`);
  }

  // Admin only. Includes deactivated criteria.
  getAllCriteria(): Observable<ManagedCriterion[]> {
    return this.http.get<ManagedCriterion[]>(`${this.baseUrl}/criteria/all`);
  }

  createCriterion(category: CriterionCategory, name: string): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.baseUrl}/criteria`, { category, name });
  }

  updateCriterion(id: number, changes: { name?: string; active?: boolean }): Observable<ManagedCriterion> {
    return this.http.put<ManagedCriterion>(`${this.baseUrl}/criteria/${id}`, changes);
  }

  deleteCriterion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/criteria/${id}`);
  }

  // Only students who already have something saved are returned.
  getSectionAssessments(classSectionId: number, academicYearId: number, term: number): Observable<StudentAssessment[]> {
    const params = new HttpParams()
      .set('classSectionId', classSectionId)
      .set('academicYearId', academicYearId)
      .set('term', term);
    return this.http.get<StudentAssessment[]>(`${this.baseUrl}/assessments`, { params });
  }

  // Every term of the year, so the card can pick the one it is showing.
  getStudentAssessments(studentId: number, academicYearId: number): Observable<StudentAssessment[]> {
    const params = new HttpParams().set('academicYearId', academicYearId);
    return this.http.get<StudentAssessment[]>(`${this.baseUrl}/assessments/student/${studentId}`, { params });
  }

  // Every student's card for a class in a single request.
  getClassCards(classSectionId: number, academicYearId: number, term: number): Observable<ClassCardsResponse> {
    const params = new HttpParams()
      .set('classSectionId', classSectionId)
      .set('academicYearId', academicYearId)
      .set('term', term);
    return this.http.get<ClassCardsResponse>(`${this.baseUrl}/class-cards`, { params });
  }

  saveAssessment(request: SaveAssessmentRequest): Observable<StudentAssessment> {
    return this.http.put<StudentAssessment>(`${this.baseUrl}/assessments`, request);
  }
}
