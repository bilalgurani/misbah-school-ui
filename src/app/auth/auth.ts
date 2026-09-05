import { Injectable, signal } from '@angular/core';

export type Role = 'ROLE_ADMIN' | 'ROLE_TEACHER';

const STORAGE_KEY = 'app-role';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly role = signal<Role>(this.readStoredRole());

  readonly currentRole = this.role.asReadonly();

  setRole(role: Role): void {
    this.role.set(role);
    localStorage.setItem(STORAGE_KEY, role);
  }

  /** ROLE_ADMIN can access everything; other roles need an explicit match. */
  canAccess(allowedRoles: Role[]): boolean {
    return this.role() === 'ROLE_ADMIN' || allowedRoles.includes(this.role());
  }

  private readStoredRole(): Role {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'ROLE_ADMIN' || stored === 'ROLE_TEACHER' ? stored : 'ROLE_TEACHER';
  }
}
