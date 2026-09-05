// src/app/auth/auth.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { Observable, tap } from 'rxjs';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  role: string;
  username: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/auth';

  // Reactive Signals synchronized with initial localStorage
  currentUser = signal<string | null>(localStorage.getItem('username'));
  currentRole = signal<string | null>(localStorage.getItem('role'));

  // Reactive Computed property for template reactivity (@if (auth.isAuthenticated()))
  isAuthenticated = computed(() => !!this.currentUser() && !!this.getToken());

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        // Strip 'ROLE_' prefix if present to standardize on 'ADMIN' or 'TEACHER'
        const normalizedRole = response.role.replace('ROLE_', '');

        localStorage.setItem('token', response.token);
        localStorage.setItem('username', response.username);
        localStorage.setItem('role', normalizedRole);

        // Setting signals forces Angular to instantly re-evaluate app layouts & guards
        this.currentUser.set(response.username);
        this.currentRole.set(normalizedRole);
      })
    );
  }

  logout(): void {
    localStorage.clear();
    this.currentUser.set(null);
    this.currentRole.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Flexible role checker that accepts either an array of roles or spread strings.
   * Examples:
   *   authService.hasRole(['ADMIN', 'TEACHER'])
   *   authService.hasRole('ADMIN')
   */
  hasRole(allowedRoles: string | string[]): boolean {
    const role = this.currentRole() || localStorage.getItem('role');
    if (!role) return false;

    // Normalize input to an array
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // ADMIN always gets access, or check if role exists in allowed list
    return role === 'ADMIN' || rolesArray.includes(role);
  }
}