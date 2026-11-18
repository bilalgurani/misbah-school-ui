import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type LedgerType = 'INCOME' | 'EXPENSE';
export type LedgerMode = 'CASH' | 'UPI' | 'CARD' | 'BANK' | 'CHEQUE';

export interface LedgerCategories {
  income: string[];
  expense: string[];
}

export interface LedgerEntry {
  id: number;
  source: 'MANUAL' | 'FEES';
  entryDate: string;
  type: LedgerType;
  category: string;
  description: string;
  amount: number;
  mode: LedgerMode | string;
  reference: string | null;
  createdBy: string | null;
  voided: boolean;
  voidReason: string | null;
}

export interface LedgerPage {
  items: LedgerEntry[];
  total: number;
  page: number;
  size: number;
}

export interface LedgerFilters {
  from: string;
  to: string;
  type: '' | LedgerType;
  category: string;
}

export interface NewLedgerEntry {
  entryDate: string;
  type: LedgerType;
  category: string;
  description: string;
  amount: number;
  mode: LedgerMode;
  reference?: string;
}

export interface CategoryTotal {
  type: LedgerType;
  category: string;
  total: number;
}

export interface ModeTotal {
  mode: string;
  income: number;
  expense: number;
  net: number;
}

export interface MonthTotal {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface LedgerSummary {
  from: string;
  to: string;
  income: number;
  expense: number;
  net: number;
  feeIncome: number;
  otherIncome: number;
  byCategory: CategoryTotal[];
  byMode: ModeTotal[];
  monthly: MonthTotal[];
}

@Injectable({ providedIn: 'root' })
export class LedgerService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ledger`;

  getCategories(): Observable<LedgerCategories> {
    return this.http.get<LedgerCategories>(`${this.apiUrl}/categories`);
  }

  getEntries(filters: LedgerFilters, page: number, size: number): Observable<LedgerPage> {
    let params = this.filterParams(filters).set('page', page).set('size', size);
    if (filters.type) params = params.set('type', filters.type);
    if (filters.category) params = params.set('category', filters.category);
    return this.http.get<LedgerPage>(`${this.apiUrl}/entries`, { params });
  }

  getSummary(filters: LedgerFilters): Observable<LedgerSummary> {
    return this.http.get<LedgerSummary>(`${this.apiUrl}/summary`, { params: this.filterParams(filters) });
  }

  create(entry: NewLedgerEntry): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.apiUrl}/entries`, entry);
  }

  voidEntry(id: number, reason: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/entries/${id}/void`, { reason });
  }

  private filterParams(filters: LedgerFilters): HttpParams {
    let params = new HttpParams();
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    return params;
  }
}
