import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { AcademicYear } from '../../academics/models/academic-year.model';
import { AcademicYearService } from '../../academics/services/academic-year.service';
import { AuthService } from '../../auth/auth.service';
import { ConfirmDialogComponent } from '../../shared/component/confirm-dialog.component';
import { LoaderComponent } from '../../shared/component/loader.component';
import { ToastService } from '../../shared/services/toast.service';
import { CalendarService, Holiday, HolidayType, NewHoliday, WorkingDaysSummary } from './calendar.service';

const toLocalDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

@Component({
  selector: 'app-holidays',
  imports: [FormsModule, DatePipe, LoaderComponent, ConfirmDialogComponent],
  templateUrl: './holidays.html',
  styleUrl: './holidays.scss',
})
export class Holidays implements OnInit {
  private calendar = inject(CalendarService);
  private yearService = inject(AcademicYearService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  readonly isAdmin = this.auth.isAdmin;
  readonly types: HolidayType[] = ['PUBLIC', 'GOVERNMENT', 'SCHOOL', 'OTHER'];

  summary = signal<WorkingDaysSummary | null>(null);
  summaryLoading = signal<boolean>(true);
  summaryError = signal<boolean>(false);

  years = signal<AcademicYear[]>([]);
  selectedYearId = signal<number | ''>('');
  from = signal<string>('');
  to = signal<string>('');

  holidays = signal<Holiday[]>([]);
  listLoading = signal<boolean>(false);
  listError = signal<boolean>(false);

  showModal = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  newHoliday: NewHoliday = { date: '', name: '', type: 'PUBLIC' };

  holidayToDelete = signal<Holiday | null>(null);
  isDeleting = signal<boolean>(false);

  sortedHolidays = computed(() => [...this.holidays()].sort((a, b) => a.date.localeCompare(b.date)));

  ngOnInit(): void {
    this.yearService.getAll().pipe(catchError(() => of([] as AcademicYear[]))).subscribe(years => {
      this.years.set(years);
      this.syncSelectedYear();
    });
    this.loadSummary(true);
  }

  loadSummary(initial = false): void {
    this.summaryLoading.set(true);
    this.summaryError.set(false);
    this.calendar.getSummary().subscribe({
      next: summary => {
        this.summary.set(summary);
        this.summaryLoading.set(false);
        if (initial) {
          this.from.set(summary.startDate);
          this.to.set(summary.endDate);
          this.syncSelectedYear();
          this.loadHolidays();
        }
      },
      error: err => {
        this.summaryLoading.set(false);
        this.summaryError.set(true);
        this.toast.showError(err, 'Failed to load the working days summary.');
        if (initial) {
          const current = this.years().find(y => y.current);
          if (current) {
            this.from.set(current.startDate);
            this.to.set(current.endDate);
            this.loadHolidays();
          }
        }
      },
    });
  }

  private syncSelectedYear(): void {
    const from = this.from();
    const to = this.to();
    const match = this.years().find(y => y.startDate === from && y.endDate === to);
    this.selectedYearId.set(match?.id ?? '');
  }

  onYearChange(id: number | ''): void {
    this.selectedYearId.set(id);
    const year = this.years().find(y => y.id === Number(id));
    if (!year) return;
    this.from.set(year.startDate);
    this.to.set(year.endDate);
    this.loadHolidays();
  }

  applyRange(): void {
    if (!this.from() || !this.to()) {
      this.toast.show('Please choose both a from and a to date.', 'error');
      return;
    }
    if (this.to() < this.from()) {
      this.toast.show('The "to" date must not be before the "from" date.', 'error');
      return;
    }
    this.syncSelectedYear();
    this.loadHolidays();
  }

  loadHolidays(): void {
    if (!this.from() || !this.to()) return;
    this.listLoading.set(true);
    this.listError.set(false);
    this.calendar.getHolidays(this.from(), this.to()).subscribe({
      next: list => {
        this.holidays.set(list ?? []);
        this.listLoading.set(false);
      },
      error: err => {
        this.holidays.set([]);
        this.listLoading.set(false);
        this.listError.set(true);
        this.toast.showError(err, 'Failed to load holidays.');
      },
    });
  }

  toDate(iso: string): Date {
    return toLocalDate(iso);
  }

  openModal(): void {
    this.newHoliday = { date: '', name: '', type: 'PUBLIC' };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveHoliday(): void {
    const { date, name, type } = this.newHoliday;
    if (!date || !name.trim()) {
      this.toast.show('Please enter the date and the holiday name.', 'error');
      return;
    }
    if (toLocalDate(date).getDay() === 0) {
      this.toast.show('Sundays are already a weekly off and cannot be added as holidays.', 'error');
      return;
    }

    this.isSaving.set(true);
    this.calendar.create({ date, name: name.trim(), type }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeModal();
        this.toast.show('Holiday added successfully.');
        this.loadHolidays();
        this.refreshSummary();
      },
      error: err => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Failed to add the holiday.');
      },
    });
  }

  requestDelete(holiday: Holiday): void {
    this.holidayToDelete.set(holiday);
  }

  cancelDelete(): void {
    this.holidayToDelete.set(null);
    this.isDeleting.set(false);
  }

  deleteHoliday(): void {
    const target = this.holidayToDelete();
    if (!target) return;

    this.isDeleting.set(true);
    this.calendar.delete(target.id).subscribe({
      next: () => {
        this.holidays.update(list => list.filter(h => h.id !== target.id));
        this.toast.show('Holiday deleted successfully.');
        this.cancelDelete();
        this.refreshSummary();
      },
      error: err => {
        this.isDeleting.set(false);
        this.toast.showError(err, 'Failed to delete the holiday.');
      },
    });
  }

  private refreshSummary(): void {
    this.calendar.getSummary().subscribe({
      next: summary => this.summary.set(summary),
      error: () => undefined,
    });
  }
}
