import { Component, signal } from '@angular/core';
import { Shell } from './shell/shell';
import { ToastComponent } from './shared/component/toast.component';

@Component({
  imports: [Shell, ToastComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('misbah-school');
}
