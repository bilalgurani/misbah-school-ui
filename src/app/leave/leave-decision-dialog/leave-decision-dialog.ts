import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveBalanceItem, LeaveRequest, LeaveService } from '../leave.service';
import { dayLabel } from '../leave.util';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  imports: [FormsModule, DatePipe],
  selector: 'app-leave-decision-dialog',
  styleUrl: './leave-decision-dialog.scss',
  templateUrl: './leave-decision-dialog.html',
})
export class LeaveDecisionDialog implements OnInit {
  private leaveService = inject(LeaveService);
  private toast = inject(ToastService);

  request = input.required<LeaveRequest>();
  mode = input.required<'approve' | 'reject'>();
  decided = output<LeaveRequest>();
  closed = output<void>();

  readonly dayLabel = dayLabel;

  note = signal<string>('');
  isSaving = signal<boolean>(false);
  balanceLoading = signal<boolean>(true);
  balance = signal<LeaveBalanceItem | null>(null);
  tried = signal<boolean>(false);

  noteMissing = computed(() => this.mode() === 'reject' && this.note().trim().length === 0);

  ngOnInit(): void {
    const request = this.request();
    this.leaveService.getBalance(request.teacherId, request.academicYearId).subscribe({
      next: (data) => {
        this.balance.set(data.balances.find(b => b.leaveTypeId === request.leaveTypeId) ?? null);
        this.balanceLoading.set(false);
      },
      error: () => this.balanceLoading.set(false),
    });
  }

  close(): void {
    if (!this.isSaving()) this.closed.emit();
  }

  submit(): void {
    this.tried.set(true);
    if (this.noteMissing()) return;

    const request = this.request();
    const note = this.note().trim();
    const approving = this.mode() === 'approve';
    this.isSaving.set(true);
    (approving ? this.leaveService.approve(request.id, note) : this.leaveService.reject(request.id, note)).subscribe({
      next: (updated) => {
        this.isSaving.set(false);
        this.toast.show(approving ? 'Leave request approved.' : 'Leave request rejected.');
        this.decided.emit(updated);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.showError(err, approving ? 'Failed to approve the request' : 'Failed to reject the request');
      },
    });
  }
}
