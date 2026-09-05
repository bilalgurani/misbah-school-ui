import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-change-password',
  styleUrl: './change-password.scss',
  templateUrl: './change-password.html',
})
export class ChangePassword {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  isLoading = signal(false);

  passForm: FormGroup = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  updatePassword() {
    if (this.passForm.invalid) return;
    this.isLoading.set(true);

    this.http.post('/api/auth/change-password', this.passForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        alert('Password updated successfully!');
        this.router.navigate(['/dashboard']);
      },
      error: () => this.isLoading.set(false)
    });
  }
}
