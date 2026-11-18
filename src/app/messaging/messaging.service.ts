import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type MessageChannel = 'SMS' | 'WHATSAPP';
export type MessagePurpose = 'ABSENCE' | 'FEE_REMINDER';
export type MessageStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface NotificationConfig {
  enabled: boolean;
  smsConfigured: boolean;
  whatsappConfigured: boolean;
  schoolName: string;
}

export interface NotificationResult {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface MessageLogItem {
  id: number;
  studentId: number | null;
  studentName: string | null;
  recipient: string | null;
  channel: string;
  purpose: string;
  referenceDate: string | null;
  status: MessageStatus;
  error: string | null;
  createdAt: string;
}

export interface MessageLogPage {
  items: MessageLogItem[];
  total: number;
  page: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class MessagingService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/notifications`;

  getConfig(): Observable<NotificationConfig> {
    return this.http.get<NotificationConfig>(`${this.baseUrl}/config`);
  }

  getLog(page: number, size: number, purpose?: string, status?: string): Observable<MessageLogPage> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (purpose) params = params.set('purpose', purpose);
    if (status) params = params.set('status', status);
    return this.http.get<MessageLogPage>(`${this.baseUrl}/log`, { params });
  }

  sendAbsenceAlerts(classSectionId: number, date: string, channels: MessageChannel[]): Observable<NotificationResult> {
    return this.http.post<NotificationResult>(`${this.baseUrl}/absence`, { classSectionId, date, channels });
  }

  sendFeeReminders(studentIds: number[], channels: MessageChannel[]): Observable<NotificationResult> {
    return this.http.post<NotificationResult>(`${this.baseUrl}/fee-reminders`, { studentIds, channels });
  }
}
