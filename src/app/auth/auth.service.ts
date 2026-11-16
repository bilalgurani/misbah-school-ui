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

// Server tokens last 30 minutes; refresh once one has under 10 minutes left and the user was active recently.
const SessionTiming = {
  CHECK_INTERVAL_MS: 60_000,
  REFRESH_BEFORE_EXPIRY_MS: 10 * 60_000,
  ACTIVE_WINDOW_MS: 20 * 60_000,
} as const;

@Injectable({ providedIn: 'root' })
export class AuthService {

  private logoutTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private lastActivity = Date.now();
  private activityTracked = false;
  private isRefreshing = false;
  
  private http = inject(HttpClient);
  private router = inject(Router);
  
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor() {
  const token = localStorage.getItem('token');
  if (token && !this.isTokenExpired(token)) {
    this.startSession(token);
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

      this.startSession(response.token);
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
  if (this.logoutTimer) clearTimeout(this.logoutTimer);
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const msUntilExpiry = payload.exp * 1000 - Date.now();
    if (msUntilExpiry > 0) {
      this.logoutTimer = setTimeout(() => this.forceLocalLogout(), msUntilExpiry);
    }
  } catch { /* ignore malformed token */ }
}

// Tokens are short-lived. While the user is active we swap in a fresh one in the background;
// an idle user simply lets it expire. The server caps the whole session regardless of activity.
private startSession(token: string): void {
  this.scheduleAutoLogout(token);
  this.trackActivity();

  if (this.refreshTimer) return;
  this.refreshTimer = setInterval(() => this.refreshIfActive(), SessionTiming.CHECK_INTERVAL_MS);
}

private trackActivity(): void {
  if (this.activityTracked) return;
  this.activityTracked = true;

  const markActive = () => { this.lastActivity = Date.now(); };
  for (const event of ['click', 'keydown', 'touchstart', 'scroll', 'mousemove']) {
    document.addEventListener(event, markActive, { passive: true });
  }
}

private refreshIfActive(): void {
  const token = localStorage.getItem('token');
  if (!token) return;

  let msUntilExpiry: number;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    msUntilExpiry = payload.exp * 1000 - Date.now();
  } catch {
    return;
  }

  const isActive = Date.now() - this.lastActivity < SessionTiming.ACTIVE_WINDOW_MS;
  if (this.isRefreshing || !isActive || msUntilExpiry > SessionTiming.REFRESH_BEFORE_EXPIRY_MS) return;

  this.isRefreshing = true;
  this.http.post<{ token: string }>(`${this.apiUrl}/refresh`, {}).subscribe({
    next: ({ token: fresh }) => {
      this.isRefreshing = false;
      localStorage.setItem('token', fresh);
      this.scheduleAutoLogout(fresh);
    },
    error: () => { this.isRefreshing = false; }
  });
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

  if (this.logoutTimer) { clearTimeout(this.logoutTimer); this.logoutTimer = null; }
  if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null; }

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