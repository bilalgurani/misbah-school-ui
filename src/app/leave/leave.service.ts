import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveType {
  id: number;
  name: string;
  daysPerYear: number;
  paid: boolean;
  unlimited: boolean;
  active: boolean;
}

export interface LeaveTypeRequest {
  name: string;
  daysPerYear: number;
  paid: boolean;
  unlimited: boolean;
}

export interface LeaveTypeUpdateRequest extends LeaveTypeRequest {
  active: boolean;
}

export interface LeaveBalanceItem {
  leaveTypeId: number;
  leaveType: string;
  paid: boolean;
  unlimited: boolean;
  baseDays: number;
  adjustedDays: number;
  entitled: number | null;
  used: number;
  pending: number;
  available: number | null;
}

export interface LeaveBalance {
  teacherId: number;
  teacherName: string;
  academicYearId: number;
  academicYear: string;
  balances: LeaveBalanceItem[];
}

export interface LeaveBalancesType {
  id: number;
  name: string;
  unlimited: boolean;
}

export interface LeaveBalanceCell {
  leaveTypeId: number;
  used: number;
  pending: number;
  available: number | null;
}

export interface LeaveTeacherBalances {
  teacherId: number;
  teacherName: string;
  balances: LeaveBalanceCell[];
}

export interface LeaveBalances {
  academicYearId: number;
  academicYear: string;
  types: LeaveBalancesType[];
  teachers: LeaveTeacherBalances[];
}

export interface LeaveSkippedDate {
  date: string;
  reason: string;
}

export interface LeavePreview {
  days: number;
  workingDays: string[];
  skipped: LeaveSkippedDate[];
}

export interface LeaveRequest {
  id: number;
  teacherId: number;
  teacherName: string;
  leaveTypeId: number;
  leaveType: string;
  paid: boolean;
  fromDate: string;
  toDate: string;
  halfDay: boolean;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  academicYearId: number;
}

export interface LeaveRequestPage {
  items: LeaveRequest[];
  total: number;
  page: number;
  size: number;
}

export interface LeaveRequestFilter {
  status?: LeaveStatus | null;
  teacherId?: number | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  size?: number;
}

export interface CreateLeaveRequest {
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  halfDay: boolean;
  reason: string;
  teacherId?: number | null;
}

export interface LeaveAdjustmentRequest {
  teacherId: number;
  leaveTypeId: number;
  academicYearId?: number | null;
  days: number;
  reason: string;
}

export interface LeaveAdjustment {
  id: number;
  teacherId: number;
  teacherName: string;
  leaveType: string;
  days: number;
  reason: string;
  createdAt: string;
  createdBy: string | null;
}

export interface OnLeaveEntry {
  requestId: number;
  teacherId: number;
  teacherName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  halfDay: boolean;
  days: number;
}

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/leave`;

  getTypes(includeInactive = false): Observable<LeaveType[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<LeaveType[]>(`${this.apiUrl}/types`, { params });
  }

  createType(request: LeaveTypeRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.apiUrl}/types`, request);
  }

  updateType(id: number, request: LeaveTypeUpdateRequest): Observable<LeaveType> {
    return this.http.put<LeaveType>(`${this.apiUrl}/types/${id}`, request);
  }

  getBalance(teacherId?: number | null, academicYearId?: number | null): Observable<LeaveBalance> {
    let params = new HttpParams();
    if (teacherId) params = params.set('teacherId', teacherId);
    if (academicYearId) params = params.set('academicYearId', academicYearId);
    return this.http.get<LeaveBalance>(`${this.apiUrl}/balance`, { params });
  }

  getBalances(academicYearId?: number | null): Observable<LeaveBalances> {
    let params = new HttpParams();
    if (academicYearId) params = params.set('academicYearId', academicYearId);
    return this.http.get<LeaveBalances>(`${this.apiUrl}/balances`, { params });
  }

  preview(from: string, to: string, halfDay: boolean): Observable<LeavePreview> {
    const params = new HttpParams().set('from', from).set('to', to).set('halfDay', halfDay);
    return this.http.get<LeavePreview>(`${this.apiUrl}/preview`, { params });
  }

  createRequest(request: CreateLeaveRequest): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.apiUrl}/requests`, request);
  }

  getRequests(filter: LeaveRequestFilter = {}): Observable<LeaveRequestPage> {
    let params = new HttpParams()
      .set('page', filter.page ?? 0)
      .set('size', filter.size ?? 50);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.teacherId) params = params.set('teacherId', filter.teacherId);
    if (filter.from) params = params.set('from', filter.from);
    if (filter.to) params = params.set('to', filter.to);
    return this.http.get<LeaveRequestPage>(`${this.apiUrl}/requests`, { params });
  }

  approve(id: number, note?: string): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.apiUrl}/requests/${id}/approve`, { note: note || null });
  }

  reject(id: number, note: string): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.apiUrl}/requests/${id}/reject`, { note });
  }

  cancel(id: number, note?: string): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.apiUrl}/requests/${id}/cancel`, { note: note || null });
  }

  createAdjustment(request: LeaveAdjustmentRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.apiUrl}/adjustments`, request);
  }

  getAdjustments(teacherId?: number | null, academicYearId?: number | null): Observable<LeaveAdjustment[]> {
    let params = new HttpParams();
    if (teacherId) params = params.set('teacherId', teacherId);
    if (academicYearId) params = params.set('academicYearId', academicYearId);
    return this.http.get<LeaveAdjustment[]>(`${this.apiUrl}/adjustments`, { params });
  }

  getOnLeave(from: string, to: string): Observable<OnLeaveEntry[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<OnLeaveEntry[]>(`${this.apiUrl}/on-leave`, { params });
  }
}
