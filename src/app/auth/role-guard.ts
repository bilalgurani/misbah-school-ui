import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, Role } from './auth';

export function roleGuard(...allowedRoles: Role[]): CanActivateFn {
  return () => {
    const auth = inject(Auth);
    return auth.canAccess(allowedRoles) ? true : inject(Router).parseUrl('/student-attendance');
  };
}
