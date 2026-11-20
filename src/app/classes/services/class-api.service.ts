import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClassLevel, ClassLevelRequest, ClassSectionItem, ClassSectionRequest, SectionSeats } from '../models/class.models';

@Injectable({ providedIn: 'root' })
export class ClassApiService {
  private http = inject(HttpClient);
  private levelsUrl = `${environment.apiUrl}/class-levels`;
  private sectionsUrl = `${environment.apiUrl}/class-sections`;

  getLevels(): Observable<ClassLevel[]> {
    return this.http.get<ClassLevel[]>(this.levelsUrl);
  }

  createLevel(request: ClassLevelRequest): Observable<ClassLevel> {
    return this.http.post<ClassLevel>(this.levelsUrl, request);
  }

  updateLevel(id: number, request: ClassLevelRequest): Observable<ClassLevel> {
    return this.http.put<ClassLevel>(`${this.levelsUrl}/${id}`, request);
  }

  // Admin only. Saves every changed class in one call, all or nothing.
  updateLevelsBulk(items: { id: number; name: string; displayOrder: number }[]): Observable<ClassLevel[]> {
    return this.http.put<ClassLevel[]>(`${this.levelsUrl}/bulk`, { items });
  }

  // Admin only. Saves every changed section (name and seat limit) in one call, all or nothing.
  updateSectionsBulk(items: { id: number; division: string; capacity: number | null }[]): Observable<void> {
    return this.http.put<void>(`${this.sectionsUrl}/bulk`, { items });
  }

  deleteLevel(id: number): Observable<void> {
    return this.http.delete<void>(`${this.levelsUrl}/${id}`);
  }

  getSections(): Observable<ClassSectionItem[]> {
    return this.http.get<ClassSectionItem[]>(this.sectionsUrl);
  }

  // Never cached on the server: the counts change with every admission.
  getSeats(): Observable<SectionSeats[]> {
    return this.http.get<SectionSeats[]>(`${this.sectionsUrl}/seats`);
  }

  // Admin only. A null capacity removes the limit.
  updateCapacity(id: number, capacity: number | null): Observable<void> {
    return this.http.put<void>(`${this.sectionsUrl}/${id}/capacity`, { capacity });
  }

  createSection(request: ClassSectionRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.sectionsUrl, request);
  }

  updateSection(id: number, request: ClassSectionRequest): Observable<void> {
    return this.http.put<void>(`${this.sectionsUrl}/${id}`, request);
  }

  deleteSection(id: number): Observable<void> {
    return this.http.delete<void>(`${this.sectionsUrl}/${id}`);
  }
}
