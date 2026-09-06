import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { DashboardStats } from "../models/dashboard.models";
import { Injectable } from "@angular/core";
import { environment } from "../../../environments/environment.prod";

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard/stats`;

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(this.apiUrl);
  }
}