import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BulkStudentRow {
  rowNumber: number;
  name: string;
  rollNo: number | null;
  satsNo: string | null;
  gender: string | null;
  fatherName: string | null;
  motherName: string | null;
  dob: string | null;
  aadharNo: string | null;
  address: string | null;
  mobileNo: string | null;
  dateOfAdmission: string | null;
  bloodGroup: string | null;
  emergencyContactName: string | null;
  emergencyContactNo: string | null;
  className: string;
  division: string;
}

export interface BulkRowResult {
  rowNumber: number;
  status: 'OK' | 'IMPORTED' | 'ERROR';
  studentId: number | null;
  errors: string[];
}

export interface BulkImportResponse {
  total: number;
  valid: number;
  imported: number;
  failed: number;
  results: BulkRowResult[];
}

@Injectable({ providedIn: 'root' })
export class StudentBulkService {
  private http = inject(HttpClient);

  import(rows: BulkStudentRow[], dryRun: boolean): Observable<BulkImportResponse> {
    return this.http.post<BulkImportResponse>(`${environment.apiUrl}/students/bulk`, { dryRun, rows });
  }
}
