// src/app/auth/login/login.ts
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);

  loginForm: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  onLogin() {
    if (this.loginForm.invalid) return;
    this.isLoading.set(true);

    this.auth.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        
        // Execute navigation and capture failure diagnostics
        this.router.navigate(['/dashboard']).then((success) => {
          if (!success) {
            console.error('Navigation to /dashboard was blocked by a route guard.');
          }
        }).catch((err) => {
          console.error('Navigation error during transition:', err);
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Login request failed:', err);
      }
    });
  }
}