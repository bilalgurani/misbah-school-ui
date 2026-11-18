import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveRequest, LeaveService, LeaveStatus, OnLeaveEntry } from '../leave.service';
import { LEAVE_STATUS_LABELS, canCancelLeave, dayLabel, statusBadgeClass } from '../leave.util';
import { LeaveApplyForm, LeaveTeacherOption } from '../leave-apply-form/leave-apply-form';
import { LeaveDecisionDialog } from '../leave-decision-dialog/leave-decision-dialog';
import { TeacherService } from '../../teachers/teacher.service';
import { ToastService } from '../../shared/services/toast.service';
import { LoaderComponent } from '../../shared/component/loader.component';
import { ConfirmDialogComponent } from '../../shared/component/confirm-dialog.component';
import { todayIso } from '../../shared/utils/date.util';

type StatusTab = LeaveStatus | 'ALL';

const PAGE_SIZE = 20;

@Component({
  imports: [FormsModule, DatePipe, LeaveApplyForm, LeaveDecisionDialog, LoaderComponent, ConfirmDialogComponent],
  selector: 'app-leave-approvals',
  styleUrl: './leave-approvals.scss',
  templateUrl: './leave-approvals.html',
})
export class LeaveApprovals implements OnInit {
  private leaveService = inject(LeaveService);
  private teacherService = inject(TeacherService);
  private toast = inject(ToastService);

  readonly tabs: { value: StatusTab; label: string }[] = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'ALL', label: 'All' },
  ];
  readonly statusLabels = LEAVE_STATUS_LABELS;
  readonly statusClass = statusBadgeClass;
  readonly dayLabel = dayLabel;

  tab = signal<StatusTab>('PENDING');
  teacherId = signal<number | null>(null);
  fromDate = signal<string>('');
  toDate = signal<string>('');
  page = signal<number>(0);

  teachers = signal<LeaveTeacherOption[]>([]);
  requests = signal<LeaveRequest[]>([]);
  total = signal<number>(0);
  pendingCount = signal<number>(0);
  isLoading = signal<boolean>(true);
  loadFailed = signal<boolean>(false);

  onLeave = signal<OnLeaveEntry[]>([]);
  onLeaveLoaded = signal<boolean>(false);

  showRecord = signal<boolean>(false);
  decision = signal<{ request: LeaveRequest; mode: 'approve' | 'reject' } | null>(null);
  requestToCancel = signal<LeaveRequest | null>(null);
  isCancelling = signal<boolean>(false);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  rangeStart = computed(() => (this.total() === 0 ? 0 : this.page() * PAGE_SIZE + 1));
  rangeEnd = computed(() => Math.min(this.total(), (this.page() + 1) * PAGE_SIZE));
  hasFilters = computed(() => !!this.teacherId() || !!this.fromDate() || !!this.toDate());

  ngOnInit(): void {
    this.teacherService.getTeachers().subscribe({
      next: (list) => this.teachers.set(list.map(t => ({ id: t.id, name: t.name }))),
      error: (err) => this.toast.showError(err, 'Failed to load teachers'),
    });
    this.loadOnLeave();
    this.loadPendingCount();
    this.load();
  }

  loadOnLeave(): void {
    const today = todayIso();
    this.leaveService.getOnLeave(today, today).subscribe({
      next: (list) => {
        this.onLeave.set(list);
        this.onLeaveLoaded.set(true);
      },
      error: () => this.onLeaveLoaded.set(false),
    });
  }

  loadPendingCount(): void {
    this.leaveService.getRequests({ status: 'PENDING', page: 0, size: 1 }).subscribe({
      next: (data) => this.pendingCount.set(data.total),
      error: () => undefined,
    });
  }

  load(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    const tab = this.tab();
    this.leaveService.getRequests({
      status: tab === 'ALL' ? null : tab,
      teacherId: this.teacherId(),
      from: this.fromDate() || null,
      to: this.toDate() || null,
      page: this.page(),
      size: PAGE_SIZE,
    }).subscribe({
      next: (data) => {
        this.requests.set(data.items);
        this.total.set(data.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.requests.set([]);
        this.total.set(0);
        this.isLoading.set(false);
        this.loadFailed.set(true);
        this.toast.showError(err, 'Failed to load leave requests');
      },
    });
  }

  selectTab(tab: StatusTab): void {
    this.tab.set(tab);
    this.page.set(0);
    this.load();
  }

  onTeacherChange(value: number | null): void {
    this.teacherId.set(value ? Number(value) : null);
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.page.set(0);
    this.load();
  }

  clearFilters(): void {
    this.teacherId.set(null);
    this.fromDate.set('');
    this.toDate.set('');
    this.onFilterChange();
  }

  goTo(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.page.set(page);
    this.load();
  }

  refreshAll(): void {
    this.loadOnLeave();
    this.loadPendingCount();
    this.load();
  }

  openDecision(request: LeaveRequest, mode: 'approve' | 'reject'): void {
    this.decision.set({ request, mode });
  }

  closeDecision(): void {
    this.decision.set(null);
  }

  onDecided(): void {
    this.decision.set(null);
    this.refreshAll();
  }

  onRecorded(): void {
    this.showRecord.set(false);
    this.page.set(0);
    this.refreshAll();
  }

  canCancel(r: LeaveRequest): boolean {
    return canCancelLeave(r.status, r.fromDate, todayIso(), true);
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
        this.refreshAll();
      },
      error: (err) => {
        this.isCancelling.set(false);
        this.toast.showError(err, 'Failed to cancel the leave request');
      },
    });
  }
}
