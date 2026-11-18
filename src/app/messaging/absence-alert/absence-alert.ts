import { Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AttendanceApiService } from '../../attendance/services/attendance-api.service';
import { MessageChannel, MessagingService, NotificationConfig } from '../messaging.service';
import { ToastService } from '../../shared/services/toast.service';
import { absenceText, normalizePhone, smsLink, whatsappLink } from '../utils/parent-message.util';

export interface Absentee {
  id: number;
  name: string;
}

interface ContactRow {
  id: number;
  name: string;
  hasPhone: boolean;
  whatsapp: SafeUrl | null;
  sms: SafeUrl | null;
}

@Component({
  imports: [FormsModule],
  selector: 'app-absence-alert',
  styleUrl: './absence-alert.scss',
  templateUrl: './absence-alert.html',
})
export class AbsenceAlert {
  private messaging = inject(MessagingService);
  private attendanceApi = inject(AttendanceApiService);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);

  classSectionId = input.required<number>();
  date = input.required<string>();
  absentCount = input.required<number>();
  absentees = input<Absentee[]>([]);
  className = input<string>('');

  isOpen = signal<boolean>(false);
  sendSms = signal<boolean>(true);
  sendWhatsapp = signal<boolean>(false);
  isSending = signal<boolean>(false);

  config = signal<NotificationConfig | null>(null);
  phones = signal<Map<number, string | null>>(new Map());
  contactsLoading = signal<boolean>(false);
  opened = signal<Set<string>>(new Set());

  // Automatic sending needs a paid provider, so it only appears when the server has it switched on.
  autoSendAvailable = computed(() => {
    const c = this.config();
    return !!c && c.enabled && (c.smsConfigured || c.whatsappConfigured);
  });

  rows = computed<ContactRow[]>(() => {
    const school = this.config()?.schoolName || 'School';
    return this.absentees().map(a => {
      const phone = normalizePhone(this.phones().get(a.id));
      if (!phone) {
        return { id: a.id, name: a.name, hasPhone: false, whatsapp: null, sms: null };
      }
      const text = absenceText(a.name, this.date(), this.className(), school);
      // The phone is digits only and the text is URL-encoded, so these links are safe to trust.
      return {
        id: a.id,
        name: a.name,
        hasPhone: true,
        whatsapp: this.sanitizer.bypassSecurityTrustUrl(whatsappLink(phone, text)),
        sms: this.sanitizer.bypassSecurityTrustUrl(smsLink(phone, text)),
      };
    });
  });

  open(): void {
    if (this.absentCount() === 0) {
      this.toast.show('No absent students to notify.', 'error');
      return;
    }
    this.sendSms.set(true);
    this.sendWhatsapp.set(false);
    this.opened.set(new Set());
    this.isOpen.set(true);
    this.loadContacts();
    this.messaging.getConfig().subscribe({
      next: (config) => this.config.set(config),
      error: () => this.config.set(null),
    });
  }

  private loadContacts(): void {
    this.contactsLoading.set(true);
    this.attendanceApi.getStudentsBySection(this.classSectionId()).subscribe({
      next: (students) => {
        this.phones.set(new Map(students.map(s => [s.id, s.mobileNo ?? null])));
        this.contactsLoading.set(false);
      },
      error: (err) => {
        this.contactsLoading.set(false);
        this.toast.showError(err, 'Failed to load parent phone numbers.');
      },
    });
  }

  markOpened(id: number, channel: 'wa' | 'sms'): void {
    this.opened.update(set => new Set(set).add(`${id}:${channel}`));
  }

  wasOpened(id: number, channel: 'wa' | 'sms'): boolean {
    return this.opened().has(`${id}:${channel}`);
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
