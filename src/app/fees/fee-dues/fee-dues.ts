import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FeeDueRow, FeeService, FeeSummary } from '../fee.service';
import { MessagingService, NotificationConfig } from '../../messaging/messaging.service';
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

  filteredDues = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.dues();
    return this.dues().filter(d =>
      (d.name ?? '').toLowerCase().includes(query) ||
      (d.fatherName ?? '').toLowerCase().includes(query) ||
      (d.mobileNo ?? '').includes(query) ||
      String(d.rollNo ?? '').toLowerCase().includes(query));
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
