import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withNavigationErrorHandler } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { jwtInterceptor } from './auth/jwt.interceptor';
import { apiBaseInterceptor } from './shared/interceptors/api-base.interceptor';
import { reloadOnStaleChunk } from './shared/utils/chunk-reload';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withNavigationErrorHandler(reloadOnStaleChunk)),
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([apiBaseInterceptor, jwtInterceptor]))
  ]
};
