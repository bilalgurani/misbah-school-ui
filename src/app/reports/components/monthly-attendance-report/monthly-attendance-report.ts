import { DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { downloadCsv, toCsv } from '../../../admin-tools/csv.util';
import { ClassSection } from '../../../attendance/models/attendance.models';
import { AttendanceApiService } from '../../../attendance/services/attendance-api.service';
import { LoaderComponent } from '../../../shared/component/loader.component';
import { ToastService } from '../../../shared/services/toast.service';
import { AttendanceRegisterService, MonthlyAttendanceResponse } from '../../services/attendance-register.service';

const LOW_THRESHOLD = 75;

const currentMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const isSunday = (iso: string): boolean => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 0;
};

const MARK_CODE = { PRESENT: 'P', ABSENT: 'A', LATE: 'L' } as const;

interface DayColumn {
  date: string;
  day: string;
  closed: boolean;
  closedCode: string;
  reason: string;
}

@Component({
  selector: 'app-monthly-attendance-report',
  imports: [FormsModule, DecimalPipe, LoaderComponent],
  templateUrl: './monthly-attendance-report.html',
  styleUrl: './monthly-attendance-report.scss',
})
export class MonthlyAttendanceReport implements OnInit, OnDestroy {
  private api = inject(AttendanceApiService);
  private reportService = inject(AttendanceRegisterService);
  private toast = inject(ToastService);
  private request?: Subscription;

  readonly lowThreshold = LOW_THRESHOLD;

  sections = signal<ClassSection[]>([]);
  sectionsLoading = signal<boolean>(true);
  selectedSectionId = signal<number | ''>('');
  month = signal<string>(currentMonth());

  report = signal<MonthlyAttendanceResponse | null>(null);
  isLoading = signal<boolean>(false);
  hasError = signal<boolean>(false);

  columns = computed<DayColumn[]>(() =>
    (this.report()?.days ?? []).map(d => ({
      date: d.date,
      day: d.date.slice(8),
      closed: !d.working,
      closedCode: isSunday(d.date) ? 'S' : 'H',
      reason: d.closureReason || (isSunday(d.date) ? 'Sunday' : 'Holiday'),
    })),
  );

  rows = computed(() => {
    const report = this.report();
    if (!report) return [];
    const cols = this.columns();
    return report.students.map(student => ({
      student,
      cells: cols.map(c => {
        if (c.closed) return { code: c.closedCode, cls: 'closed' };
        const mark = student.statuses?.[c.date];
        return mark ? { code: MARK_CODE[mark], cls: mark.toLowerCase() } : { code: '', cls: '' };
      }),
    }));
  });

  ngOnInit(): void {
    this.api.getClassSections().subscribe({
      next: sections => {
        this.sections.set(sections);
        this.sectionsLoading.set(false);
      },
      error: err => {
        this.sectionsLoading.set(false);
        this.toast.showError(err, 'Failed to load class sections.');
      },
    });
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }

  isLow(pct: number | null): boolean {
    return pct !== null && pct !== undefined && pct < LOW_THRESHOLD;
  }

  generate(): void {
    const sectionId = this.selectedSectionId();
    if (sectionId === '' || !this.month()) {
      this.toast.show('Please select a class section and a month.', 'error');
      return;
    }

    this.request?.unsubscribe();
    this.isLoading.set(true);
    this.hasError.set(false);
    this.report.set(null);

    this.request = this.reportService.getMonthly(this.month(), Number(sectionId)).subscribe({
      next: report => {
        this.report.set(report);
        this.isLoading.set(false);
      },
      error: err => {
        this.hasError.set(true);
        this.isLoading.set(false);
        this.toast.showError(err, 'Failed to generate the monthly attendance report.');
      },
    });
  }

  exportCsv(): void {
    const report = this.report();
    if (!report) return;

    const cols = this.columns();
    const header = ['Roll No', 'Name', ...cols.map(c => c.day), 'Present', 'Absent', 'Late', 'Attendance %'];
    const body = this.rows().map(r => [
      r.student.rollNo,
      r.student.name,
      ...r.cells.map(c => c.code),
      r.student.present,
      r.student.absent,
      r.student.late,
      r.student.attendancePct === null || r.student.attendancePct === undefined ? '' : r.student.attendancePct.toFixed(1),
    ]);
    const rows = [
      [`Monthly attendance register - ${report.className} - ${report.month}`],
      ['Working days', report.workingDays, 'Days attendance taken', report.daysAttendanceTaken],
      [],
      header,
      ...body,
    ];
    downloadCsv(`attendance-register-${report.className}-${report.month}.csv`.replace(/\s+/g, '-'), toCsv(rows));
  }
}
