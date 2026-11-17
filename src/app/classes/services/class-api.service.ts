import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClassLevel, ClassLevelRequest, ClassSectionItem, ClassSectionRequest } from '../models/class.models';

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

  deleteLevel(id: number): Observable<void> {
    return this.http.delete<void>(`${this.levelsUrl}/${id}`);
  }

  getSections(): Observable<ClassSectionItem[]> {
    return this.http.get<ClassSectionItem[]>(this.sectionsUrl);
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
