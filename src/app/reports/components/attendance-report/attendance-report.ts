import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LoaderComponent } from '../../../shared/component/loader.component';
import { PagerComponent } from '../../../shared/component/pager.component';
import { createPaging } from '../../../shared/utils/paging.util';
import { ToastService } from '../../../shared/services/toast.service';
import { AbsenteeRow, AttendanceReport } from '../../models/attendance-report.model';
import { attendanceReportToCsv } from '../../services/attendance-report.csv';
import { LOW_ATTENDANCE_THRESHOLD } from '../../services/attendance-report.builder';
import { AttendanceReportService } from '../../services/attendance-report.service';

// Local calendar date (toISOString would shift the day in timezones ahead of UTC).
const todayLocal = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

@Component({
  selector: 'app-attendance-report',
  imports: [FormsModule, DatePipe, DecimalPipe, LoaderComponent, PagerComponent],
  templateUrl: './attendance-report.html',
  styleUrl: './attendance-report.scss',
})
export class AttendanceReportComponent implements OnInit, OnDestroy {
  private reportService = inject(AttendanceReportService);
  private toast = inject(ToastService);
  private request?: Subscription;

  readonly maxDate = todayLocal();
  readonly lowThreshold = LOW_ATTENDANCE_THRESHOLD;

  selectedDate = signal<string>(todayLocal());
  report = signal<AttendanceReport | null>(null);
  isLoading = signal<boolean>(false);
  hasError = signal<boolean>(false);

  absentStudents = computed(() => this.report()?.absentees.filter(a => a.status === 'ABSENT') ?? []);
  lateStudents = computed(() => this.report()?.absentees.filter(a => a.status === 'LATE') ?? []);

  // Absent and late students grouped by class, in class order. Classes with nobody absent or late are left out.
  absenteeGroups = computed(() => {
    const report = this.report();
    if (!report) return [];
    const byClass = new Map<string, { className: string; absent: AbsenteeRow[]; late: AbsenteeRow[] }>();
    for (const row of report.classRows) {
      byClass.set(row.displayName, { className: row.displayName, absent: [], late: [] });
    }
    for (const a of report.absentees) {
      const group = byClass.get(a.className);
      if (group) (a.status === 'ABSENT' ? group.absent : group.late).push(a);
    }
    return [...byClass.values()].filter(g => g.absent.length + g.late.length > 0);
  });

  // The screen shows a few classes at a time. Printing switches to showing every class.
  paging = createPaging(() => this.absenteeGroups(), () => this.report(), 5);
  printingAll = signal<boolean>(false);
  readonly pageSizes = [3, 5, 10, 25];
  visibleGroups = computed(() => (this.printingAll() ? this.absenteeGroups() : this.paging.paged()));

  ngOnInit(): void {
    this.generate();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }

  generate(): void {
    const date = this.selectedDate();
    if (!date) {
      this.toast.show('Please select a date to generate the report.', 'error');
      return;
    }

    this.request?.unsubscribe();
    this.isLoading.set(true);
    this.hasError.set(false);
    this.report.set(null);

    this.request = this.reportService.getDailyReport(date).subscribe({
      next: report => {
        this.report.set(report);
        this.isLoading.set(false);
      },
      error: err => {
        this.hasError.set(true);
        this.isLoading.set(false);
        this.toast.showError(err, 'Failed to generate the attendance report');
      },
    });
  }

  print(): void {
    // Show every class on paper, not just the page being looked at, then go back to the paged view.
    this.printingAll.set(true);
    setTimeout(() => {
      window.print();
      this.printingAll.set(false);
    }, 50);
  }

  downloadCsv(): void {
    const report = this.report();
    if (!report) return;

    const blob = new Blob(['\uFEFF' + attendanceReportToCsv(report)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${report.date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  isLow(pct: number | null): boolean {
    return pct !== null && pct < this.lowThreshold;
  }

  failedNames(r: AttendanceReport): string {
    return r.failedSections.map(c => c.displayName).join(', ');
  }

  lowNames(r: AttendanceReport): string {
    return r.lowAttendanceClasses.map(c => c.displayName).join(', ') || 'None';
  }
}
