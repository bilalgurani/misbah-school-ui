// src/app/shared/interceptors/api-base.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  // If the request is relative (e.g., '/auth/login'), prepend the environment API URL
  // A relative apiUrl (the dev proxy's '/api') is already part of the URL services build, so it is not added twice.
  const alreadyPrefixed = req.url === environment.apiUrl || req.url.startsWith(`${environment.apiUrl}/`);
  if (!alreadyPrefixed && !req.url.startsWith('http://') && !req.url.startsWith('https://')) {
    const apiReq = req.clone({
      url: `${environment.apiUrl}${req.url.startsWith('/') ? req.url : '/' + req.url}`
    });
    return next(apiReq);
  }
  return next(req);
};