import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ToastService } from '../../shared/services/toast.service';
import { PasswordToggleDirective } from '../../shared/directives/password-toggle.directive';
import { BackupService } from './backup.service';

const STORAGE_KEY = 'lastBackupAt';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function fallbackName(): string {
  const d = new Date();
  return `school-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.sql`;
}

function filenameFrom(header: string | null): string {
  const match = header?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const name = match?.[1]?.trim();
  return name ? decodeURIComponent(name) : fallbackName();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readLastBackup(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

@Component({
  imports: [DatePipe, PasswordToggleDirective],
  selector: 'app-database-backup',
  styleUrl: './backup.scss',
  templateUrl: './backup.html',
})
export class DatabaseBackup {
  private backupService = inject(BackupService);
  private toast = inject(ToastService);

  running = signal<boolean>(false);
  password = signal<string>('');
  lastBackupAt = signal<string | null>(readLastBackup());
  lastFile = signal<{ name: string; size: string } | null>(null);

  download(): void {
    if (this.running()) return;
    if (!this.password()) {
      this.toast.show('Enter your password to download a backup.', 'error');
      return;
    }
    this.running.set(true);
    this.backupService.download(this.password()).subscribe({
      next: res => {
        this.password.set('');
        const blob = res.body;
        if (!blob || blob.size === 0) {
          this.running.set(false);
          this.toast.show('The server returned an empty backup file.', 'error');
          return;
        }
        const name = filenameFrom(res.headers.get('Content-Disposition'));
        this.save(blob, name);
        const now = new Date().toISOString();
        try {
          localStorage.setItem(STORAGE_KEY, now);
        } catch { /* storage unavailable */ }
        this.lastBackupAt.set(now);
        this.lastFile.set({ name, size: formatSize(blob.size) });
        this.running.set(false);
        this.toast.show('Backup downloaded.');
      },
      error: async (err: HttpErrorResponse) => {
        const text = err.error instanceof Blob ? await err.error.text().catch(() => '') : '';
        let message = '';
        try {
          message = JSON.parse(text)?.message ?? '';
        } catch {
          message = text;
        }
        this.running.set(false);
        this.toast.showError(message ? { error: { message } } : err, 'Backup failed. Please try again.');
      },
    });
  }

  private save(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
