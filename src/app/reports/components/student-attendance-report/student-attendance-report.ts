import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription, catchError, of } from 'rxjs';
import { downloadCsv, toCsv } from '../../../admin-tools/csv.util';
import { ClassSection } from '../../../attendance/models/attendance.models';
import { AttendanceApiService } from '../../../attendance/services/attendance-api.service';
import { LoaderComponent } from '../../../shared/component/loader.component';
import { ToastService } from '../../../shared/services/toast.service';
import { StudentService } from '../../../students/student.service';
import { AttendanceRegisterService, StudentAttendanceResponse } from '../../services/attendance-register.service';

const LOW_THRESHOLD = 75;
const MAX_OPTIONS = 50;

interface StudentOption {
  id: number;
  name: string;
  rollNo: string;
  className: string;
  label: string;
  haystack: string;
}

const toLocalDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

@Component({
  selector: 'app-student-attendance-report',
  imports: [FormsModule, DatePipe, DecimalPipe, LoaderComponent],
  templateUrl: './student-attendance-report.html',
  styleUrl: './student-attendance-report.scss',
})
export class StudentAttendanceReport implements OnInit, OnDestroy {
  private studentService = inject(StudentService);
  private attendanceApi = inject(AttendanceApiService);
  private reportService = inject(AttendanceRegisterService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private request?: Subscription;
  private routeSub?: Subscription;
  private pendingStudentId: number | null = null;

  readonly lowThreshold = LOW_THRESHOLD;

  students = signal<StudentOption[]>([]);
  studentsLoading = signal<boolean>(true);
  studentsError = signal<boolean>(false);

  query = signal<string>('');
  listOpen = signal<boolean>(false);
  selectedId = signal<number | null>(null);
  from = signal<string>('');
  to = signal<string>('');

  report = signal<StudentAttendanceResponse | null>(null);
  isLoading = signal<boolean>(false);
  hasError = signal<boolean>(false);

  options = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.students();
    const matches = q ? all.filter(s => s.haystack.includes(q)) : all;
    return matches.slice(0, MAX_OPTIONS);
  });

  ngOnInit(): void {
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const id = Number(params.get('studentId'));
      this.pendingStudentId = Number.isFinite(id) && id > 0 ? id : null;
      if (!this.studentsLoading()) this.applyPreselect();
    });
    this.loadStudents();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  loadStudents(): void {
    this.studentsLoading.set(true);
    this.studentsError.set(false);
    this.attendanceApi
      .getClassSections()
      .pipe(catchError(() => of([] as ClassSection[])))
      .subscribe(sections => {
        const classNames = new Map(sections.map(s => [s.id, s.displayName]));
        this.studentService.getStudents().subscribe({
          next: list => {
            this.students.set((list ?? []).map(s => this.toOption(s, classNames)));
            this.studentsLoading.set(false);
            this.applyPreselect();
          },
          error: err => {
            this.studentsLoading.set(false);
            this.studentsError.set(true);
            this.toast.showError(err, 'Failed to load students.');
            this.applyPreselect();
          },
        });
      });
  }

  private toOption(s: any, classNames: Map<number, string>): StudentOption {
    const className: string =
      s.classSectionName ?? s.className ?? s.classSection?.displayName ?? classNames.get(s.classSectionId) ?? '';
    const rollNo = s.rollNo === null || s.rollNo === undefined ? '' : String(s.rollNo);
    const name = String(s.name ?? [s.firstName, s.lastName].filter(Boolean).join(' '));
    const label = [rollNo && `#${rollNo}`, name, className && `(${className})`].filter(Boolean).join(' ');
    return { id: s.id, name, rollNo, className, label, haystack: `${name} ${rollNo} ${className}`.toLowerCase() };
  }

  private applyPreselect(): void {
    const id = this.pendingStudentId;
    if (id === null) return;
    this.pendingStudentId = null;
    const match = this.students().find(s => s.id === id);
    this.query.set(match?.label ?? `Student #${id}`);
    this.selectedId.set(id);
    this.generate();
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.listOpen.set(true);
    this.selectedId.set(null);
  }

  select(option: StudentOption): void {
    this.selectedId.set(option.id);
    this.query.set(option.label);
    this.listOpen.set(false);
    this.generate();
  }

  closeList(): void {
    setTimeout(() => this.listOpen.set(false), 150);
  }

  generate(): void {
    const id = this.selectedId();
    if (id === null) {
      this.toast.show('Please pick a student from the list.', 'error');
      return;
    }
    if (this.from() && this.to() && this.to() < this.from()) {
      this.toast.show('The "to" date must not be before the "from" date.', 'error');
      return;
    }

    this.request?.unsubscribe();
    this.isLoading.set(true);
    this.hasError.set(false);
    this.report.set(null);

    this.request = this.reportService.getStudent(id, this.from(), this.to()).subscribe({
      next: report => {
        this.report.set(report);
        this.isLoading.set(false);
      },
      error: err => {
        this.hasError.set(true);
        this.isLoading.set(false);
        this.toast.showError(err, 'Failed to load the student attendance report.');
      },
    });
  }

  isLow(pct: number | null | undefined): boolean {
    return pct !== null && pct !== undefined && pct < LOW_THRESHOLD;
  }

  monthDate(month: string): Date {
    return toLocalDate(`${month}-01`);
  }

  toDate(iso: string): Date {
    return toLocalDate(iso);
  }

  print(): void {
    window.print();
  }

  exportCsv(): void {
    const r = this.report();
    if (!r) return;

    const pct = (v: number | null | undefined) => (v === null || v === undefined ? '' : v.toFixed(1));
    const rows = [
      ['Student attendance report'],
      ['Name', r.name],
      ['Roll No', r.rollNo],
      ['Class', r.className],
      ['Period', `${r.from} to ${r.to}`],
      [],
      ['Working days', 'Days attendance taken', 'Present', 'Absent', 'Late', 'Marked days', 'Unmarked working days', 'Attendance %'],
      [r.workingDays, r.daysAttendanceTaken, r.present, r.absent, r.late, r.markedDays, r.unmarkedWorkingDays, pct(r.attendancePct)],
      [],
      ['Month', 'Working days', 'Marked days', 'Present', 'Absent', 'Late', 'Attendance %'],
      ...(r.months ?? []).map(m => [m.month, m.workingDays, m.markedDays, m.present, m.absent, m.late, pct(m.attendancePct)]),
      [],
      ['Absent / late date', 'Status'],
      ...(r.absentDates ?? []).map(a => [a.date, a.status]),
    ];
    downloadCsv(`student-attendance-${r.name}-${r.from}-${r.to}.csv`.replace(/\s+/g, '-'), toCsv(rows));
  }
}
