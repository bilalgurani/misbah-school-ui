import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageLogItem, MessagingService } from '../messaging.service';
import { ToastService } from '../../shared/services/toast.service';
import { LoaderComponent } from '../../shared/component/loader.component';

@Component({
  imports: [FormsModule, DatePipe, LoaderComponent],
  selector: 'app-message-log',
  styleUrl: './message-log.scss',
  templateUrl: './message-log.html',
})
export class MessageLog implements OnInit {
  private messaging = inject(MessagingService);
  private toast = inject(ToastService);

  readonly pageSize = 50;
  readonly purposes = [
    { value: 'ABSENCE', label: 'Absence alert' },
    { value: 'FEE_REMINDER', label: 'Fee reminder' },
  ];
  readonly statuses = ['QUEUED', 'SENT', 'FAILED', 'SKIPPED'];

  items = signal<MessageLogItem[]>([]);
  total = signal<number>(0);
  page = signal<number>(0);
  purpose = signal<string>('');
  status = signal<string>('');
  isLoading = signal<boolean>(true);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  rangeStart = computed(() => (this.total() === 0 ? 0 : this.page() * this.pageSize + 1));
  rangeEnd = computed(() => Math.min(this.total(), (this.page() + 1) * this.pageSize));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.messaging.getLog(this.page(), this.pageSize, this.purpose(), this.status()).subscribe({
      next: (res) => {
        this.items.set(res.items ?? []);
        this.total.set(res.total ?? 0);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.items.set([]);
        this.total.set(0);
        this.isLoading.set(false);
        this.toast.showError(err, 'Failed to load message log');
      },
    });
  }

  onFilterChange(): void {
    this.page.set(0);
    this.load();
  }

  goTo(page: number): void {
    if (page < 0 || page >= this.totalPages() || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  purposeLabel(value: string): string {
    return this.purposes.find(p => p.value === value)?.label ?? value;
  }

  statusClass(status: string): string {
    switch (status) {
      case 'SENT': return 'badge-success';
      case 'FAILED': return 'badge-danger';
      case 'SKIPPED': return 'badge-warning';
      default: return 'badge-info';
    }
  }
}
