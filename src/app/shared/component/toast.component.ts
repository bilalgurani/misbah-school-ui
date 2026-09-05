import { Component, inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    @if (toastService.message()) {
      <div class="custom-toast" [class.toast-success]="toastService.type() === 'success'" [class.toast-error]="toastService.type() === 'error'">
        <span>{{ toastService.message() }}</span>
      </div>
    }
  `
})
export class ToastComponent {
  toastService = inject(ToastService);
}