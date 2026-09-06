import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/teachers`;

  getTeachers(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getTeacherById(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createTeacher(teacherData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, teacherData);
  }

  updateTeacher(id: string | number, teacherData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, teacherData);
  }

  getFullTeacherById(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/view/${id}`);
  }

  deleteTeacher(id: string | number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}