// src/app/auth/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export class AuthGuards {
  static authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Check both service signal and direct localStorage token existence
    const hasToken = authService.isAuthenticated();

    if (hasToken) {
      return true;
    }

    return router.createUrlTree(['/login']);
  };

  static redirectIfAuthenticatedGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const hasToken = authService.isAuthenticated();

    if (hasToken) {
      return router.createUrlTree([authService.mustChangePassword() ? '/change-password' : '/dashboard']);
    }

    return true;
  };

  // Locks users with a temporary password to the change-password page.
  static passwordChangeGuard: CanActivateChildFn = (_route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.mustChangePassword() && !state.url.startsWith('/change-password')) {
      return router.createUrlTree(['/change-password']);
    }

    return true;
  };

  static roleGuard = (...allowedRoles: string[]): CanActivateFn => {
    return () => {
      const authService = inject(AuthService);
      const router = inject(Router);

      const hasToken = authService.isAuthenticated();
      if (!hasToken) {
        return router.createUrlTree(['/login']);
      }

      return authService.hasRole(allowedRoles)
        ? true
        : router.createUrlTree(['/dashboard']);
    };
  };
}