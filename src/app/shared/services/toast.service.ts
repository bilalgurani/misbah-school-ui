import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  message = signal<string | null>(null);
  type = signal<'success' | 'error'>('success');
  private timer: any = null;

  show(msg: string, toastType: 'success' | 'error' = 'success') {
    if (this.timer) clearTimeout(this.timer);
    this.message.set(msg);
    this.type.set(toastType);

    this.timer = setTimeout(() => {
      this.message.set(null);
    }, 3500);
  }
}