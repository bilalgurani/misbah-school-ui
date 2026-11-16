import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageChannel, MessagingService } from '../messaging.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  imports: [FormsModule],
  selector: 'app-absence-alert',
  styleUrl: './absence-alert.scss',
  templateUrl: './absence-alert.html',
})
export class AbsenceAlert {
  private messaging = inject(MessagingService);
  private toast = inject(ToastService);

  classSectionId = input.required<number>();
  date = input.required<string>();
  absentCount = input.required<number>();

  isOpen = signal<boolean>(false);
  sendSms = signal<boolean>(true);
  sendWhatsapp = signal<boolean>(false);
  isSending = signal<boolean>(false);

  open(): void {
    if (this.absentCount() === 0) {
      this.toast.show('No absent students to notify.', 'error');
      return;
    }
    this.sendSms.set(true);
    this.sendWhatsapp.set(false);
    this.isOpen.set(true);
  }

  close(): void {
    if (this.isSending()) return;
    this.isOpen.set(false);
  }

  send(): void {
    const channels: MessageChannel[] = [];
    if (this.sendSms()) channels.push('SMS');
    if (this.sendWhatsapp()) channels.push('WHATSAPP');
    if (channels.length === 0) return;

    this.isSending.set(true);
    this.messaging.sendAbsenceAlerts(this.classSectionId(), this.date(), channels).subscribe({
      next: (result) => {
        this.isSending.set(false);
        this.isOpen.set(false);
        this.toast.show(
          `Absence alerts: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped.`,
          result.failed > 0 ? 'error' : 'success');
      },
      error: (err) => {
        this.isSending.set(false);
        this.toast.showError(err, 'Failed to send absence alerts');
      },
    });
  }
}
