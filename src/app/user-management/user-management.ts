import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../shared/services/toast.service';

export interface ManagedUser {
  id: number;
  username: string;
  email: string;
  role: string;
  teacher_id: number | null;
  enabled: boolean;
  must_change_password: boolean;
}

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-user-management',
  styleUrl: './user-management.scss',
  templateUrl: './user-management.html',
})
export class UserManagement implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private authService = inject(AuthService);

  private usersUrl = `${environment.apiUrl}/users`;

  users = signal<ManagedUser[]>([]);
  selectedUser = signal<ManagedUser | null>(null);
  isLoading = signal(false);
  isSaving = signal(false);

  resetForm: FormGroup = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  isSelf(user: ManagedUser): boolean {
    return user.username === this.authService.currentUser();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.http.get<ManagedUser[]>(this.usersUrl).subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.showError(err, 'Failed to load users.');
      }
    });
  }

  selectUser(user: ManagedUser): void {
    this.selectedUser.set(user);
    this.resetForm.reset({ newPassword: '' });
  }

  cancel(): void {
    this.selectedUser.set(null);
    this.resetForm.reset({ newPassword: '' });
  }

  resetPassword(): void {
    const user = this.selectedUser();
    if (!user || this.resetForm.invalid) return;

    this.isSaving.set(true);
    this.http.post(`${this.usersUrl}/${user.id}/reset-password`, this.resetForm.value).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast.show(`Password reset for ${user.username}. They must change it at next login.`);
        this.cancel();
        this.loadUsers();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Failed to reset password.');
      }
    });
  }
}
