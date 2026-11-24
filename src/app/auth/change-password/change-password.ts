import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../shared/services/toast.service';
import { PasswordToggleDirective } from '../../shared/directives/password-toggle.directive';
import { AuthService } from '../auth.service';

@Component({
  imports: [ReactiveFormsModule, PasswordToggleDirective],
  selector: 'app-change-password',
  styleUrl: './change-password.scss',
  templateUrl: './change-password.html',
})
export class ChangePassword {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private authService = inject(AuthService);
  mustChange = this.authService.mustChangePassword;
  isLoading = signal(false);
  // The server's reason (for example "must not contain your username"), kept on screen next to the form.
  serverError = signal('');

  passForm: FormGroup = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(10)]]
  });

  updatePassword() {
    if (this.passForm.invalid) return;
    this.isLoading.set(true);
    this.serverError.set('');

    this.http.post(`${environment.apiUrl}/auth/change-password`, this.passForm.value, { responseType: 'text' }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.show('Password updated. Please sign in again.');
        // The server revokes the current token on password change.
        this.authService.forceLocalLogout();
      },
      error: (err) => {
        this.isLoading.set(false);
        const body = err?.error;
        this.serverError.set(typeof body === 'string' ? body : body?.message ?? '');
        this.toast.showError(err, 'Failed to update password.');
      }
    });
  }
}
