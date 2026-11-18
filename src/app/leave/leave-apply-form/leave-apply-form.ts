import { Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, distinctUntilChanged, map, switchMap, tap, timer } from 'rxjs';
import { LeavePreview, LeaveRequest, LeaveService, LeaveType } from '../leave.service';
import { dayLabel, errorMessage } from '../leave.util';
import { ToastService } from '../../shared/services/toast.service';

export interface LeaveTeacherOption {
  id: number;
  name: string;
}

@Component({
  imports: [ReactiveFormsModule, DatePipe],
  selector: 'app-leave-apply-form',
  styleUrl: './leave-apply-form.scss',
  templateUrl: './leave-apply-form.html',
})
export class LeaveApplyForm implements OnInit {
  private fb = inject(FormBuilder);
  private leaveService = inject(LeaveService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  teachers = input<LeaveTeacherOption[] | null>(null);
  title = input<string>('Apply for leave');
  saved = output<LeaveRequest>();

  leaveTypes = signal<LeaveType[]>([]);
  typesLoading = signal<boolean>(true);
  preview = signal<LeavePreview | null>(null);
  previewError = signal<string | null>(null);
  previewLoading = signal<boolean>(false);
  canHalfDay = signal<boolean>(false);
  submitted = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  readonly dayLabel = dayLabel;

  form = this.fb.nonNullable.group({
    teacherId: this.fb.control<number | null>(null),
    leaveTypeId: this.fb.control<number | null>(null, Validators.required),
    fromDate: ['', Validators.required],
    toDate: ['', Validators.required],
    halfDay: [{ value: false, disabled: true }],
    reason: ['', [Validators.required, Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    this.leaveService.getTypes(false).subscribe({
      next: (types) => {
        this.leaveTypes.set(types.filter(t => t.active));
        this.typesLoading.set(false);
      },
      error: (err) => {
        this.typesLoading.set(false);
        this.toast.showError(err, 'Failed to load leave types');
      },
    });

    this.form.valueChanges.pipe(
      map(() => this.syncDates()),
      distinctUntilChanged(),
      tap(() => {
        this.preview.set(null);
        this.previewError.set(null);
        this.previewLoading.set(false);
      }),
      switchMap(key => {
        const [from, to, half] = key.split('|');
        if (!from || !to) return EMPTY;
        if (to < from) {
          this.previewError.set('The end date cannot be before the start date.');
          return EMPTY;
        }
        this.previewLoading.set(true);
        return timer(250).pipe(
          switchMap(() => this.leaveService.preview(from, to, half === 'true')),
          catchError((err) => {
            this.previewLoading.set(false);
            this.previewError.set(errorMessage(err, 'Could not work out the leave days for these dates.'));
            return EMPTY;
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => {
      this.previewLoading.set(false);
      this.preview.set(result);
    });
  }

  private syncDates(): string {
    const value = this.form.getRawValue();
    if (value.fromDate && !value.toDate) {
      this.form.controls.toDate.setValue(value.fromDate, { emitEvent: false });
    }
    const from = value.fromDate;
    const to = this.form.controls.toDate.value;
    const half = !!from && from === to;
    const control = this.form.controls.halfDay;
    this.canHalfDay.set(half);
    if (half && control.disabled) {
      control.enable({ emitEvent: false });
    } else if (!half && control.enabled) {
      control.setValue(false, { emitEvent: false });
      control.disable({ emitEvent: false });
    }
    return `${from}|${to}|${half && control.value}`;
  }

  submit(): void {
    this.submitted.set(true);
    const value = this.form.getRawValue();
    const needsTeacher = this.teachers() !== null;
    if (this.form.invalid || (needsTeacher && !value.teacherId)) return;
    if (!this.preview() || this.previewError() || this.previewLoading()) return;

    this.isSaving.set(true);
    this.leaveService.createRequest({
      leaveTypeId: Number(value.leaveTypeId),
      fromDate: value.fromDate,
      toDate: value.toDate,
      halfDay: value.halfDay,
      reason: value.reason.trim(),
      teacherId: needsTeacher ? Number(value.teacherId) : null,
    }).subscribe({
      next: (request) => {
        this.isSaving.set(false);
        this.toast.show(needsTeacher ? 'Leave recorded and approved.' : 'Leave request submitted.');
        this.submitted.set(false);
        this.form.reset({ teacherId: null, leaveTypeId: null, fromDate: '', toDate: '', halfDay: false, reason: '' });
        this.saved.emit(request);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Failed to submit the leave request');
      },
    });
  }
}
