// src/app/auth/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export class AuthGuards {
  static authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Check both service signal and direct localStorage token existence
    const hasToken = authService.isAuthenticated() || !!localStorage.getItem('token');

    if (hasToken) {
      return true;
    }

    return router.createUrlTree(['/login']);
  };

  static redirectIfAuthenticatedGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const hasToken = authService.isAuthenticated() || !!localStorage.getItem('token');

    if (hasToken) {
      return router.createUrlTree(['/dashboard']);
    }

    return true;
  };

  static roleGuard = (...allowedRoles: string[]): CanActivateFn => {
    return () => {
      const authService = inject(AuthService);
      const router = inject(Router);

      const hasToken = authService.isAuthenticated() || !!localStorage.getItem('token');
      if (!hasToken) {
        return router.createUrlTree(['/login']);
      }

      return authService.hasRole(allowedRoles)
        ? true
        : router.createUrlTree(['/dashboard']);
    };
  };
}