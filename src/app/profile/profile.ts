import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  imports: [RouterLink],
  selector: 'app-profile',
  styleUrl: './profile.scss',
  templateUrl: './profile.html',
})
export class Profile {
  authService = inject(AuthService);

  initials = computed(() => {
    const name = (this.authService.currentUser() || '').trim();
    return name ? name.slice(0, 2).toUpperCase() : '?';
  });

  roleLabel = computed(() => {
    const role = this.authService.currentRole();
    return role === 'ADMIN' ? 'Administrator' : role === 'TEACHER' ? 'Teacher' : role || 'Member';
  });

  // The token only tells us when the current one runs out; it is renewed while the user is active.
  sessionEndsAt = computed(() => {
    this.authService.currentUser();
    const token = this.authService.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  });

  permissions = computed(() =>
    this.authService.isAdmin()
      ? [
          'Manage students, teachers and academic years',
          'Mark and review student and teacher attendance',
          'Collect fees, follow up on absences and dues, and view reports',
          'Create user accounts and reset passwords',
          'View the audit log',
        ]
      : [
          'Mark student attendance for any class',
          'View the student directory and dashboard',
          'View attendance reports and the holiday calendar',
          'Notify parents of absentees',
        ],
  );

  logout(): void {
    this.authService.logout();
  }
}
