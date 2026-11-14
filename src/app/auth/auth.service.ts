// src/app/auth/auth.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

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
  must_change_password?: boolean;
}

export interface UserProfile {
  username: string;
  email: string;
  role: string;
  teacher_id?: string | null;
  must_change_password?: boolean;
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
  
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor() {
  const token = localStorage.getItem('token');
  if (token && !this.isTokenExpired(token)) {
    this.scheduleAutoLogout(token);
  }
}

  // Reactive Signals synchronized with initial localStorage
  currentUser = signal<string | null>(localStorage.getItem('username'));
  currentEmail = signal<string | null>(localStorage.getItem('email'));
  currentRole = signal<string | null>(localStorage.getItem('role'));
  currentTeacherId = signal<string | null>(localStorage.getItem('teacher_id'));
  mustChangePassword = signal<boolean>(localStorage.getItem('must_change_password') === 'true');
  isLoggedIn = signal<boolean>(this.hasValidToken());

  // Reactive Computed property for template reactivity (@if (auth.isAuthenticated()))
  isAuthenticated = computed(() => !!this.currentUser() && !!this.getToken());
  isAdmin = computed(() => this.currentRole() === 'ADMIN');
  isTeacher = computed(() => this.currentRole() === 'TEACHER');

  login(credentials: LoginRequest): Observable<AuthResponse> {
  return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
    tap((response) => {
      const normalizedRole = response.role.replace('ROLE_', '');

      localStorage.setItem('token', response.token);
      localStorage.setItem('username', response.username);
      localStorage.setItem('role', normalizedRole);

      if (response.email) {
        localStorage.setItem('email', response.email);
        this.currentEmail.set(response.email);
      } else {
        localStorage.removeItem('email');
        this.currentEmail.set(null);
      }

      if (response.teacher_id) {
        localStorage.setItem('teacher_id', response.teacher_id);
        this.currentTeacherId.set(response.teacher_id);
      } else {
        localStorage.removeItem('teacher_id');
        this.currentTeacherId.set(null);
      }

      this.setMustChangePassword(!!response.must_change_password);

      this.currentUser.set(response.username);
      this.currentRole.set(normalizedRole);
      this.isLoggedIn.set(true);

      this.scheduleAutoLogout(response.token);
    })
  );
}

  private isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

private hasValidToken(): boolean {
  const token = localStorage.getItem('token');
  return !!token && !this.isTokenExpired(token);
}

private scheduleAutoLogout(token: string): void {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const msUntilExpiry = payload.exp * 1000 - Date.now();
    if (msUntilExpiry > 0) {
      setTimeout(() => this.forceLocalLogout(), msUntilExpiry);
    }
  } catch { /* ignore malformed token */ }
}

/** Clears local session only — no backend call. Use this from the interceptor
 *  when a 401 tells us the token is already invalid server-side. */
forceLocalLogout(): void {
  this.clearLocalSession();
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

      // Only trust the profile when the server actually reports the flag.
      if (profile.must_change_password !== undefined) {
        this.setMustChangePassword(profile.must_change_password);
      }
    })
  );
}

private setMustChangePassword(value: boolean): void {
  if (value) {
    localStorage.setItem('must_change_password', 'true');
  } else {
    localStorage.removeItem('must_change_password');
  }
  this.mustChangePassword.set(value);
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
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('role');
  localStorage.removeItem('teacher_id');
  localStorage.removeItem('email');
  localStorage.removeItem('must_change_password');
  sessionStorage.clear();

  this.mustChangePassword.set(false);
  this.isLoggedIn.set(false);
  this.currentUser.set(null);
  this.currentEmail.set(null);
  this.currentRole.set(null);
  this.currentTeacherId.set(null);

  this.router.navigate(['/login']);
}


  getToken(): string | null {
  const token = localStorage.getItem('token');
  if (token && this.isTokenExpired(token)) {
    this.forceLocalLogout();
    return null;
  }
  return token;
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