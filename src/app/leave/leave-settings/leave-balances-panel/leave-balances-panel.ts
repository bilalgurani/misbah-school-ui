import { Component, OnDestroy, effect, inject, input, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { LeaveBalanceCell, LeaveBalances, LeaveService, LeaveTeacherBalances } from '../../leave.service';
import { limitLabel } from '../../leave.util';
import { ToastService } from '../../../shared/services/toast.service';
import { LoaderComponent } from '../../../shared/component/loader.component';
import { downloadCsv, toCsv } from '../../../shared/utils/csv.util';

@Component({
  imports: [LoaderComponent],
  selector: 'app-leave-balances-panel',
  styleUrl: './leave-balances-panel.scss',
  templateUrl: './leave-balances-panel.html',
})
export class LeaveBalancesPanel implements OnDestroy {
  private leaveService = inject(LeaveService);
  private toast = inject(ToastService);
  private request?: Subscription;

  yearId = input<number | null>(null);
  refresh = input<number>(0);

  readonly limitLabel = limitLabel;

  data = signal<LeaveBalances | null>(null);
  isLoading = signal<boolean>(true);
  loadFailed = signal<boolean>(false);

  constructor() {
    effect(() => {
      const yearId = this.yearId();
      this.refresh();
      untracked(() => this.load(yearId));
    });
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }

  load(yearId: number | null = this.yearId()): void {
    this.request?.unsubscribe();
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.request = this.leaveService.getBalances(yearId).subscribe({
      next: (data) => {
        this.data.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.data.set(null);
        this.isLoading.set(false);
        this.loadFailed.set(true);
        this.toast.showError(err, 'Failed to load leave balances');
      },
    });
  }

  cell(teacher: LeaveTeacherBalances, typeId: number): LeaveBalanceCell | undefined {
    return teacher.balances.find(b => b.leaveTypeId === typeId);
  }

  exportCsv(): void {
    const data = this.data();
    if (!data || data.teachers.length === 0) {
      this.toast.show('No balances to export.', 'error');
      return;
    }
    const header = ['Teacher', ...data.types.flatMap(t => [`${t.name} available`, `${t.name} used`, `${t.name} pending`])];
    const rows = data.teachers.map(teacher => [
      teacher.teacherName,
      ...data.types.flatMap(type => {
        const c = this.cell(teacher, type.id);
        return [type.unlimited ? 'No limit' : (c?.available ?? ''), c?.used ?? 0, c?.pending ?? 0];
      }),
    ]);
    downloadCsv(`leave-balances-${data.academicYear.replace(/[^\w-]+/g, '_')}.csv`, toCsv([header, ...rows]));
  }
}
