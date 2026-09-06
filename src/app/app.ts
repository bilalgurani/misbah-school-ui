import { Component, inject, signal } from '@angular/core';
import { ToastComponent } from './shared/component/toast.component';
import { AuthService } from './auth/auth.service';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [ToastComponent, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('misbah-school');
  protected auth = inject(AuthService);
}
