import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LoaderComponent } from '../../shared/component/loader.component';
import { ToastService } from '../../shared/services/toast.service';
import { downloadCsv, toCsv } from '../csv.util';
import { AuditEntry, AuditFilters, AuditService } from './audit.service';

const PAGE_SIZE = 50;

@Component({
  selector: 'app-audit-log',
  imports: [FormsModule, DatePipe, LoaderComponent],
  templateUrl: './audit-log.html',
  styleUrl: './audit-log.scss',
})
export class AuditLog implements OnInit, OnDestroy {
  private auditService = inject(AuditService);
  private toast = inject(ToastService);
  private request?: Subscription;

  readonly entityTypes = [
    'students', 'teachers', 'attendance', 'teacher-attendance', 'users', 'auth',
    'holidays', 'fees', 'academic-years', 'enrollments', 'notifications',
  ];
  readonly pageSize = PAGE_SIZE;

  filters: AuditFilters = { username: '', entityType: '', action: '', from: '', to: '' };

  items = signal<AuditEntry[]>([]);
  total = signal<number>(0);
  page = signal<number>(0);
  isLoading = signal<boolean>(false);
  hasError = signal<boolean>(false);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  rangeStart = computed(() => (this.total() === 0 ? 0 : this.page() * PAGE_SIZE + 1));
  rangeEnd = computed(() => Math.min(this.total(), this.page() * PAGE_SIZE + this.items().length));

  ngOnInit(): void {
    this.load(0);
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }

  search(): void {
    if (this.filters.from && this.filters.to && this.filters.to < this.filters.from) {
      this.toast.show('The "to" date must not be before the "from" date.', 'error');
      return;
    }
    this.load(0);
  }

  reset(): void {
    this.filters = { username: '', entityType: '', action: '', from: '', to: '' };
    this.load(0);
  }

  prev(): void {
    if (this.page() > 0 && !this.isLoading()) this.load(this.page() - 1);
  }

  next(): void {
    if (this.page() + 1 < this.totalPages() && !this.isLoading()) this.load(this.page() + 1);
  }

  load(page: number): void {
    this.request?.unsubscribe();
    this.isLoading.set(true);
    this.hasError.set(false);

    this.request = this.auditService.getPage(page, PAGE_SIZE, this.filters).subscribe({
      next: res => {
        this.items.set(res.items ?? []);
        this.total.set(res.total ?? 0);
        this.page.set(res.page ?? page);
        this.isLoading.set(false);
      },
      error: err => {
        this.items.set([]);
        this.total.set(0);
        this.hasError.set(true);
        this.isLoading.set(false);
        this.toast.showError(err, 'Failed to load the audit log.');
      },
    });
  }

  exportCsv(): void {
    const items = this.items();
    if (items.length === 0) return;

    const rows = [
      ['Time', 'User', 'Role', 'Action', 'Entity', 'Entity ID', 'Summary', 'IP Address'],
      ...items.map(i => [
        new Date(i.occurredAt).toLocaleString(),
        i.username, i.role, i.action, i.entityType, i.entityId, i.summary, i.ipAddress,
      ]),
    ];
    downloadCsv(`audit-log-page-${this.page() + 1}.csv`, toCsv(rows));
  }
}
