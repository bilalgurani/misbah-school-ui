import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { LeaveBalance, LeaveRequest, LeaveService } from '../leave.service';
import { LEAVE_STATUS_LABELS, canCancelLeave, dayLabel, limitLabel, statusBadgeClass } from '../leave.util';
import { LeaveApplyForm } from '../leave-apply-form/leave-apply-form';
import { ToastService } from '../../shared/services/toast.service';
import { LoaderComponent } from '../../shared/component/loader.component';
import { ConfirmDialogComponent } from '../../shared/component/confirm-dialog.component';
import { todayIso } from '../../shared/utils/date.util';

const PAGE_SIZE = 20;

@Component({
  imports: [DatePipe, LeaveApplyForm, LoaderComponent, ConfirmDialogComponent],
  selector: 'app-my-leave',
  styleUrl: './my-leave.scss',
  templateUrl: './my-leave.html',
})
export class MyLeave implements OnInit {
  private auth = inject(AuthService);
  private leaveService = inject(LeaveService);
  private toast = inject(ToastService);

  readonly statusLabels = LEAVE_STATUS_LABELS;
  readonly statusClass = statusBadgeClass;
  readonly dayLabel = dayLabel;
  readonly limitLabel = limitLabel;

  linked = computed(() => !!this.auth.currentTeacherId());

  balance = signal<LeaveBalance | null>(null);
  balanceLoading = signal<boolean>(true);
  balanceFailed = signal<boolean>(false);

  requests = signal<LeaveRequest[]>([]);
  total = signal<number>(0);
  page = signal<number>(0);
  historyLoading = signal<boolean>(true);
  historyFailed = signal<boolean>(false);

  requestToCancel = signal<LeaveRequest | null>(null);
  isCancelling = signal<boolean>(false);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  rangeStart = computed(() => (this.total() === 0 ? 0 : this.page() * PAGE_SIZE + 1));
  rangeEnd = computed(() => Math.min(this.total(), (this.page() + 1) * PAGE_SIZE));

  ngOnInit(): void {
    if (!this.linked()) return;
    this.loadBalance();
    this.loadHistory();
  }

  loadBalance(): void {
    this.balanceLoading.set(true);
    this.balanceFailed.set(false);
    this.leaveService.getBalance().subscribe({
      next: (data) => {
        this.balance.set(data);
        this.balanceLoading.set(false);
      },
      error: (err) => {
        this.balanceLoading.set(false);
        this.balanceFailed.set(true);
        this.toast.showError(err, 'Failed to load your leave balance');
      },
    });
  }

  loadHistory(): void {
    this.historyLoading.set(true);
    this.historyFailed.set(false);
    this.leaveService.getRequests({ page: this.page(), size: PAGE_SIZE }).subscribe({
      next: (data) => {
        this.requests.set(data.items);
        this.total.set(data.total);
        this.historyLoading.set(false);
      },
      error: (err) => {
        this.requests.set([]);
        this.historyLoading.set(false);
        this.historyFailed.set(true);
        this.toast.showError(err, 'Failed to load your leave requests');
      },
    });
  }

  goTo(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.page.set(page);
    this.loadHistory();
  }

  onSaved(): void {
    this.page.set(0);
    this.loadBalance();
    this.loadHistory();
  }

  canCancel(r: LeaveRequest): boolean {
    return canCancelLeave(r.status, r.fromDate, todayIso(), false);
  }

  requestCancel(r: LeaveRequest): void {
    this.requestToCancel.set(r);
  }

  dismissCancel(): void {
    this.requestToCancel.set(null);
    this.isCancelling.set(false);
  }

  confirmCancel(): void {
    const target = this.requestToCancel();
    if (!target) return;

    this.isCancelling.set(true);
    this.leaveService.cancel(target.id).subscribe({
      next: () => {
        this.toast.show('Leave request cancelled.');
        this.dismissCancel();
        this.loadBalance();
        this.loadHistory();
      },
      error: (err) => {
        this.isCancelling.set(false);
        this.toast.showError(err, 'Failed to cancel the leave request');
      },
    });
  }
}
