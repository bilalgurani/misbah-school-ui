import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FeeDueRow, FeeService, FeeSummary } from '../fee.service';
import { MessageChannel, MessagingService, NotificationConfig, NotificationResult } from '../../messaging/messaging.service';
import { AttendanceApiService } from '../../attendance/services/attendance-api.service';
import { ClassSection } from '../../attendance/models/attendance.models';
import { ToastService } from '../../shared/services/toast.service';
import { LoaderComponent } from '../../shared/component/loader.component';
import { InrPipe } from '../utils/inr.pipe';
import { FeeDuesCharts } from './fee-dues-charts';
import { downloadCsv, toCsv } from '../../shared/utils/csv.util';
import { todayIso } from '../../shared/utils/date.util';
import { feeText, normalizePhone, smsLink, whatsappLink } from '../../messaging/utils/parent-message.util';

@Component({
  imports: [FormsModule, RouterLink, DatePipe, InrPipe, LoaderComponent, FeeDuesCharts],
  selector: 'app-fee-dues',
  styleUrl: './fee-dues.scss',
  templateUrl: './fee-dues.html',
})
export class FeeDues implements OnInit {
  private feeService = inject(FeeService);
  private messaging = inject(MessagingService);
  private attendanceApi = inject(AttendanceApiService);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);

  summary = signal<FeeSummary | null>(null);
  config = signal<NotificationConfig | null>(null);
  classSections = signal<ClassSection[]>([]);
  dues = signal<FeeDueRow[]>([]);
  isLoading = signal<boolean>(true);

  classSectionId = signal<number | null>(null);
  overdueOnly = signal<boolean>(false);
  searchQuery = signal<string>('');
  selectedIds = signal<number[]>([]);

  reminderOpen = signal<boolean>(false);
  sendSms = signal<boolean>(true);
  sendWhatsapp = signal<boolean>(false);
  isSending = signal<boolean>(false);
  lastResult = signal<NotificationResult | null>(null);

  filteredDues = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.dues();
    return this.dues().filter(d =>
      (d.name ?? '').toLowerCase().includes(query) ||
      (d.fatherName ?? '').toLowerCase().includes(query) ||
      (d.mobileNo ?? '').includes(query) ||
      String(d.rollNo ?? '').toLowerCase().includes(query));
  });

  // Automatic sending needs a paid provider, so it only appears when the server has it switched on.
  autoSendAvailable = computed(() => {
    const c = this.config();
    return !!c && c.enabled && (c.smsConfigured || c.whatsappConfigured);
  });

  // Free click-to-send links that open the user's own WhatsApp / SMS app with the message filled in.
  quickLinks = computed(() => {
    const school = this.config()?.schoolName || 'School';
    const links = new Map<number, { whatsapp: SafeUrl; sms: SafeUrl }>();
    for (const d of this.dues()) {
      const phone = normalizePhone(d.mobileNo);
      if (!phone) continue;
      const text = feeText(d.name, d.balance, d.oldestDueDate, school);
      // The phone is digits only and the text is URL-encoded, so these links are safe to trust.
      links.set(d.studentId, {
        whatsapp: this.sanitizer.bypassSecurityTrustUrl(whatsappLink(phone, text)),
        sms: this.sanitizer.bypassSecurityTrustUrl(smsLink(phone, text)),
      });
    }
    return links;
  });

  selectedVisible = computed(() => {
    const selected = new Set(this.selectedIds());
    return this.filteredDues().filter(d => selected.has(d.studentId));
  });

  allSelected = computed(() =>
    this.filteredDues().length > 0 && this.selectedVisible().length === this.filteredDues().length);

  channels = computed<MessageChannel[]>(() => {
    const list: MessageChannel[] = [];
    if (this.sendSms()) list.push('SMS');
    if (this.sendWhatsapp()) list.push('WHATSAPP');
    return list;
  });

  ngOnInit(): void {
    this.feeService.getSummary().subscribe({
      next: (data) => this.summary.set(data),
      error: (err) => this.toast.showError(err, 'Failed to load fee summary'),
    });
    this.messaging.getConfig().subscribe({
      next: (data) => this.config.set(data),
      error: () => this.config.set(null),
    });
    this.attendanceApi.getClassSections().subscribe({
      next: (data) => this.classSections.set(data),
      error: (err) => this.toast.showError(err, 'Failed to load class sections'),
    });
    this.loadDues();
  }

  loadDues(): void {
    this.isLoading.set(true);
    this.feeService.getDues(this.classSectionId(), this.overdueOnly()).subscribe({
      next: (data) => {
        this.dues.set(data);
        this.selectedIds.set([]);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.dues.set([]);
        this.isLoading.set(false);
        this.toast.showError(err, 'Failed to load fee dues');
      },
    });
  }

  onSectionChange(value: number | null): void {
    this.classSectionId.set(value ? Number(value) : null);
    this.loadDues();
  }

  onOverdueChange(value: boolean): void {
    this.overdueOnly.set(value);
    this.loadDues();
  }

  isSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }

  toggleRow(id: number): void {
    this.selectedIds.update(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }

  toggleAll(): void {
    this.selectedIds.set(this.allSelected() ? [] : this.filteredDues().map(d => d.studentId));
  }

  openReminder(): void {
    if (this.selectedVisible().length === 0) {
      this.toast.show('Select at least one student first.', 'error');
      return;
    }
    this.sendSms.set(true);
    this.sendWhatsapp.set(false);
    this.reminderOpen.set(true);
  }

  closeReminder(): void {
    if (this.isSending()) return;
    this.reminderOpen.set(false);
  }

  sendReminders(): void {
    const ids = this.selectedVisible().map(d => d.studentId);
    const channels = this.channels();
    if (ids.length === 0 || channels.length === 0) return;

    this.isSending.set(true);
    this.messaging.sendFeeReminders(ids, channels).subscribe({
      next: (result) => {
        this.isSending.set(false);
        this.reminderOpen.set(false);
        this.lastResult.set(result);
        this.selectedIds.set([]);
        this.toast.show(`Reminders: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped.`,
          result.failed > 0 ? 'error' : 'success');
      },
      error: (err) => {
        this.isSending.set(false);
        this.toast.showError(err, 'Failed to send reminders');
      },
    });
  }

  exportCsv(): void {
    const rows = this.filteredDues();
    if (rows.length === 0) {
      this.toast.show('No dues to export.', 'error');
      return;
    }
    const csv = toCsv([
      ['Name', 'Roll No', 'Class', 'Father Name', 'Mobile', 'Total', 'Paid', 'Balance', 'Overdue Amount', 'Oldest Due Date'],
      ...rows.map(d => [
        d.name, d.rollNo, d.className, d.fatherName, d.mobileNo,
        d.totalAmount, d.totalPaid, d.balance, d.overdueAmount, d.oldestDueDate,
      ]),
    ]);
    downloadCsv(`fee-dues-${todayIso()}.csv`, csv);
  }
}
