import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'BANK' | 'CHEQUE';

export interface ClassLevel {
  id: number;
  name: string;
}

export interface FeeInstallment {
  id: number;
  academicYearId: number;
  classLevelId: number;
  classLevelName: string;
  name: string;
  amount: number;
  dueDate: string;
}

export interface CreateInstallmentsRequest {
  academicYearId?: number | null;
  classLevelIds: number[];
  name: string;
  amount: number;
  dueDate: string;
}

export interface StudentInstallmentStatus {
  installmentId: number;
  name: string;
  amount: number;
  dueDate: string;
  paid: number;
  balance: number;
  overdue: boolean;
}

export interface FeePaymentRow {
  id: number;
  receiptNo: string;
  installmentName: string;
  amount: number;
  paidOn: string;
  mode: string;
  reference: string | null;
}

export interface StudentFeeDetails {
  studentId: number;
  name: string;
  className: string;
  fatherName: string | null;
  mobileNo: string | null;
  academicYear: string;
  installments: StudentInstallmentStatus[];
  totalAmount: number;
  totalPaid: number;
  totalBalance: number;
  payments: FeePaymentRow[];
}

export interface RecordPaymentRequest {
  studentId: number;
  installmentId: number;
  amount: number;
  paidOn: string;
  mode: PaymentMode;
  reference: string | null;
}

export interface FeeReceipt {
  id: number;
  receiptNo: string;
  paidOn: string;
  schoolName: string;
  academicYear: string;
  studentId: number;
  studentName: string;
  className: string;
  fatherName: string | null;
  installmentName: string;
  amount: number;
  mode: string;
  reference: string | null;
  balanceAfter: number;
  recordedBy: string | null;
}

export interface FeeDueRow {
  studentId: number;
  name: string;
  rollNo: number | string | null;
  className: string;
  fatherName: string | null;
  mobileNo: string | null;
  totalAmount: number;
  totalPaid: number;
  balance: number;
  overdueAmount: number;
  oldestDueDate: string | null;
}

export interface FeeSummary {
  totalAmount: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueOutstanding: number;
  collectedThisMonth: number;
}

@Injectable({ providedIn: 'root' })
export class FeeService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/fees`;

  getClassLevels(): Observable<ClassLevel[]> {
    return this.http.get<ClassLevel[]>(`${environment.apiUrl}/class-levels`);
  }

  getInstallments(academicYearId?: number | null, classLevelId?: number | null): Observable<FeeInstallment[]> {
    let params = new HttpParams();
    if (academicYearId) params = params.set('academicYearId', academicYearId);
    if (classLevelId) params = params.set('classLevelId', classLevelId);
    return this.http.get<FeeInstallment[]>(`${this.baseUrl}/installments`, { params });
  }

  createInstallments(request: CreateInstallmentsRequest): Observable<{ ids: number[] }> {
    return this.http.post<{ ids: number[] }>(`${this.baseUrl}/installments`, request);
  }

  deleteInstallment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/installments/${id}`);
  }

  getStudentFees(studentId: number): Observable<StudentFeeDetails> {
    return this.http.get<StudentFeeDetails>(`${this.baseUrl}/students/${studentId}`);
  }

  recordPayment(request: RecordPaymentRequest): Observable<FeeReceipt> {
    return this.http.post<FeeReceipt>(`${this.baseUrl}/payments`, request);
  }

  getReceipt(paymentId: number): Observable<FeeReceipt> {
    return this.http.get<FeeReceipt>(`${this.baseUrl}/payments/${paymentId}/receipt`);
  }

  getDues(classSectionId: number | null, overdueOnly: boolean): Observable<FeeDueRow[]> {
    let params = new HttpParams().set('overdueOnly', overdueOnly);
    if (classSectionId) params = params.set('classSectionId', classSectionId);
    return this.http.get<FeeDueRow[]>(`${this.baseUrl}/dues`, { params });
  }

  getSummary(): Observable<FeeSummary> {
    return this.http.get<FeeSummary>(`${this.baseUrl}/summary`);
  }
}
