// src/app/auth/auth.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, of, tap } from 'rxjs';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  role: string;
  username: string;
  email?: string;
  teacher_id?: string | null;
}

export interface UserProfile {
  username: string;
  email: string;
  role: string;
  teacher_id?: string | null;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  private apiUrl = 'http://localhost:8080/api/auth';

  // Reactive Signals synchronized with initial localStorage
  currentUser = signal<string | null>(localStorage.getItem('username'));
  currentEmail = signal<string | null>(localStorage.getItem('email'));
  currentRole = signal<string | null>(localStorage.getItem('role'));
  currentTeacherId = signal<string | null>(localStorage.getItem('teacher_id'));

  // Reactive Computed property for template reactivity (@if (auth.isAuthenticated()))
  isAuthenticated = computed(() => !!this.currentUser() && !!this.getToken());
  isAdmin = computed(() => this.currentRole() === 'ADMIN');
  isTeacher = computed(() => this.currentRole() === 'TEACHER');

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        // Strip 'ROLE_' prefix if present to standardize on 'ADMIN' or 'TEACHER'
        const normalizedRole = response.role.replace('ROLE_', '');

        localStorage.setItem('token', response.token);
        localStorage.setItem('username', response.username);
        localStorage.setItem('role', normalizedRole);
        if (response.teacher_id) {
          localStorage.setItem('teacher_id', response.teacher_id);
          this.currentTeacherId.set(response.teacher_id);
        }

        // Setting signals forces Angular to instantly re-evaluate app layouts & guards
        this.currentUser.set(response.username);
        this.currentRole.set(normalizedRole);
      })
    );
  }

  fetchProfile(): Observable<UserProfile> {
  return this.http.get<UserProfile>(`${this.apiUrl}/user`).pipe(
    tap((profile) => {
      const normalizedRole = profile.role.replace('ROLE_', '').toUpperCase();

      localStorage.setItem('username', profile.username);
      localStorage.setItem('email', profile.email || '');
      localStorage.setItem('role', normalizedRole);

      this.currentUser.set(profile.username);
      this.currentEmail.set(profile.email || null);
      this.currentRole.set(normalizedRole);

      if (profile.teacher_id) {
        localStorage.setItem('teacher_id', profile.teacher_id);
        this.currentTeacherId.set(profile.teacher_id);
      }
    })
  );
}

  register(data: RegisterRequest): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/register`, data);
}

  logout(): void {
  this.http.post(`${this.apiUrl}/logout`, {}).pipe(
    catchError(() => of(null)), // Ensure local cleanup even if API fails or network is offline
    tap(() => this.clearLocalSession())
  ).subscribe();
}

private clearLocalSession(): void {
  // 1. Remove auth-specific keys explicitly (avoids wiping non-auth app data)
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('role');
  localStorage.removeItem('teacher_id');

  // 2. Reset reactive signals
  this.currentUser.set(null);
  this.currentRole.set(null);
  this.currentTeacherId.set(null);

  // 3. Navigate user to login page
  this.router.navigate(['/login']);
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