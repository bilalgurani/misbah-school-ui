import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService } from '../auth.service';

@Component({
  imports: [ReactiveFormsModule],
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

  passForm: FormGroup = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  updatePassword() {
    if (this.passForm.invalid) return;
    this.isLoading.set(true);

    this.http.post(`${environment.apiUrl}/auth/change-password`, this.passForm.value, { responseType: 'text' }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.show('Password updated. Please sign in again.');
        // The server revokes the current token on password change.
        this.authService.forceLocalLogout();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.showError(err, 'Failed to update password.');
      }
    });
  }
}
