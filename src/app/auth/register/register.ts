import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { ToastService } from '../../shared/services/toast.service';

export interface UnlinkedTeacher {
  id: number;
  name: string;
  email?: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule],
  styleUrl: './register.scss',
  templateUrl: './register.html',
})
export class Register implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  isSubmitting = signal(false);
  unlinkedTeachers = signal<UnlinkedTeacher[]>([]);

  registerForm: FormGroup = this.fb.group(
    {
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      role: ['TEACHER', [Validators.required]],
      teacherId: [null]
    },
    { validators: this.passwordMatchValidator }
  );

  ngOnInit(): void {
    this.loadUnlinkedTeachers();

    // Reset teacherId if role is switched away from TEACHER
    this.registerForm.get('role')?.valueChanges.subscribe((selectedRole) => {
      if (selectedRole !== 'TEACHER') {
        this.registerForm.get('teacherId')?.setValue(null);
      }
    });
  }

  loadUnlinkedTeachers(): void {
    // Replace API URL with your actual endpoint for unlinked teachers
    this.http.get<UnlinkedTeacher[]>('http://localhost:8080/api/teachers/unlinked').subscribe({
      next: (teachers) => this.unlinkedTeachers.set(teachers),
      error: () => this.toast.show('Failed to load teachers list', 'error')
    });
  }

  // Set email/username defaults when selecting a teacher from dropdown
  onTeacherSelect(event: Event): void {
    const selectedId = Number((event.target as HTMLSelectElement).value);
    const selectedTeacher = this.unlinkedTeachers().find((t) => t.id === selectedId);

    if (selectedTeacher) {
      if (selectedTeacher.email) {
        this.registerForm.patchValue({ email: selectedTeacher.email });
      }
    }
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  get f() {
    return this.registerForm.controls;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.toast.show('Please fill in all required fields correctly.', 'error');
      return;
    }

    this.isSubmitting.set(true);
    const formValues = this.registerForm.value;

    const payload: any = {
      username: formValues.username,
      email: formValues.email,
      password: formValues.password,
      role: String(formValues.role).toUpperCase()
    };

    // Attach teacherId ONLY if role is TEACHER
    if (payload.role === 'TEACHER' && formValues.teacherId) {
      payload.teacherId = Number(formValues.teacherId);
    }

    this.authService.register(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.show('User registered successfully!', 'success');
        this.registerForm.reset({ role: 'TEACHER', teacherId: null });
        this.loadUnlinkedTeachers(); // Refresh unlinked teachers list
      },
      error: (err) => {
        this.isSubmitting.set(false);

        if (err.status === 409 && err.error?.field) {
          const targetField = err.error.field;
          const message = err.error.message;

          if (this.registerForm.get(targetField)) {
            this.registerForm.get(targetField)?.setErrors({ duplicate: message });
          }
          this.toast.show(message, 'error');
        } else {
          const errorMsg = err?.error?.message || 'Registration failed. Please try again.';
          this.toast.show(errorMsg, 'error');
        }
      }
    });
  }
}