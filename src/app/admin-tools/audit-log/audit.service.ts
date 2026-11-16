import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuditEntry {
  id: number;
  occurredAt: string;
  username: string;
  role: string;
  action: string;
  entityType: string;
  entityId: string | number | null;
  summary: string;
  ipAddress: string;
}

export interface AuditPage {
  items: AuditEntry[];
  total: number;
  page: number;
  size: number;
}

export interface AuditFilters {
  username: string;
  entityType: string;
  action: string;
  from: string;
  to: string;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/audit`;

  getPage(page: number, size: number, filters: AuditFilters): Observable<AuditPage> {
    let params = new HttpParams().set('page', page).set('size', size);
    for (const [key, value] of Object.entries(filters)) {
      const trimmed = value?.trim();
      if (trimmed) params = params.set(key, trimmed);
    }
    return this.http.get<AuditPage>(this.apiUrl, { params });
  }
}
