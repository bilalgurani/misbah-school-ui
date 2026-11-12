import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';
import { ToastService } from '../shared/services/toast.service';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-user-management',
  styleUrl: './user-management.scss',
  templateUrl: './user-management.html',
})
export class UserManagement {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  isLoading = signal(false);

  userForm: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    teacherId: [null, Validators.required],
    role: ['TEACHER']
  });

  createTeacher() {
    if (this.userForm.invalid) return;
    this.isLoading.set(true);

    this.http.post(`${environment.apiUrl}/auth/register`, this.userForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.userForm.reset({ role: 'TEACHER' });
        this.toast.show('Teacher user account successfully provisioned!');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.showError(err, 'Failed to create user account.');
      }
    });
  }
}
