import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TermsStatus {
  version: string;
  accepted: boolean;
  acceptedBy: string | null;
  acceptedAt: string | null;
  required: boolean;
}

@Injectable({ providedIn: 'root' })
export class TermsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/terms`;

  getStatus(): Observable<TermsStatus> {
    return this.http.get<TermsStatus>(`${this.baseUrl}/status`);
  }

  accept(version: string): Observable<TermsStatus> {
    return this.http.post<TermsStatus>(`${this.baseUrl}/accept`, {
      version,
      agreedTerms: true,
      agreedDataConsent: true,
    });
  }
}
