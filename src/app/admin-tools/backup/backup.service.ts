import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BackupService {
  private http = inject(HttpClient);

  download(password: string): Observable<HttpResponse<Blob>> {
    return this.http.post(`${environment.apiUrl}/admin/backup`, { password }, { responseType: 'blob', observe: 'response' });
  }
}
