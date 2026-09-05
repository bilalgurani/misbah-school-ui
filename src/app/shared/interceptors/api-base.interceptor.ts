// src/app/shared/interceptors/api-base.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  // If the request is relative (e.g., '/auth/login'), prepend the environment API URL
  if (!req.url.startsWith('http://') && !req.url.startsWith('https://')) {
    const apiReq = req.clone({
      url: `${environment.apiUrl}${req.url.startsWith('/') ? req.url : '/' + req.url}`
    });
    return next(apiReq);
  }
  return next(req);
};