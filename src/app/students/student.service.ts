import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private apiUrl = 'http://localhost:8080/api/students';

  constructor(private http: HttpClient) {}

  getStudents(classSectionId?: number): Observable<any[]> {
    const url = classSectionId ? `${this.apiUrl}?classSectionId=${classSectionId}` : this.apiUrl;
    return this.http.get<any[]>(url);
  }

  getStudentById(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  getFullStudentById(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/view/${id}`);
  }

  createStudent(studentData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, studentData);
  }

  updateStudent(id: string | number, studentData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, studentData);
  }

  deleteStudent(id: string | number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}