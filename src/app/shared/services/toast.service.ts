import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  message = signal<string | null>(null);
  type = signal<'success' | 'error'>('success');
  private timer: any = null;

  // Callers often pass the caught error as the 2nd arg; anything other than 'success' counts as an error.
  show(msg: string, toastType?: unknown) {
    if (this.timer) clearTimeout(this.timer);
    this.message.set(msg);
    this.type.set(toastType === undefined || toastType === 'success' ? 'success' : 'error');

    this.timer = setTimeout(() => {
      this.message.set(null);
    }, 3500);
  }

  // API errors arrive as {message}, a plain string, or nothing (network down).
  showError(err: any, fallback: string) {
    const body = err?.error;
    const apiMessage = typeof body === 'string' ? body : body?.message;
    this.show(apiMessage || (err?.status === 0 ? 'Cannot reach the server. Check your connection.' : fallback), 'error');
  }
}