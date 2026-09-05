import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { DashboardStats } from "../models/dashboard.models";
import { Injectable } from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl = 'http://localhost:8080/api/dashboard/stats';

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(this.apiUrl);
  }
}