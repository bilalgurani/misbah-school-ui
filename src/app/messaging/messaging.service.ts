import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NotificationConfig {
  schoolName: string;
}

@Injectable({ providedIn: 'root' })
export class MessagingService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/notifications`;

  getConfig(): Observable<NotificationConfig> {
    return this.http.get<NotificationConfig>(`${this.baseUrl}/config`);
  }
}
