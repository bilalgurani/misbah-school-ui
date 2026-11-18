import { Component, OnDestroy, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LeaveAdjustment, LeaveService, LeaveType } from '../../leave.service';
import { LeaveTeacherOption } from '../../leave-apply-form/leave-apply-form';
import { ToastService } from '../../../shared/services/toast.service';
import { LoaderComponent } from '../../../shared/component/loader.component';

const nonZero = (control: { value: unknown }) => (Number(control.value) === 0 || control.value === null ? { zero: true } : null);

@Component({
  imports: [ReactiveFormsModule, FormsModule, DatePipe, LoaderComponent],
  selector: 'app-leave-adjustments-panel',
  styleUrl: './leave-adjustments-panel.scss',
  templateUrl: './leave-adjustments-panel.html',
})
export class LeaveAdjustmentsPanel implements OnDestroy {
  private fb = inject(FormBuilder);
  private leaveService = inject(LeaveService);
  private toast = inject(ToastService);
  private request?: Subscription;

  types = input.required<LeaveType[]>();
  teachers = input.required<LeaveTeacherOption[]>();
  yearId = input<number | null>(null);
  refresh = input<number>(0);
  changed = output<void>();

  adjustableTypes = computed(() => this.types().filter(t => t.active && !t.unlimited));

  adjustments = signal<LeaveAdjustment[]>([]);
  filterTeacherId = signal<number | null>(null);
  isLoading = signal<boolean>(true);
  loadFailed = signal<boolean>(false);
  submitted = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  form = this.fb.nonNullable.group({
    teacherId: this.fb.control<number | null>(null, Validators.required),
    leaveTypeId: this.fb.control<number | null>(null, Validators.required),
    days: this.fb.control<number | null>(null, [Validators.required, nonZero]),
    reason: ['', [Validators.required, Validators.maxLength(300)]],
  });

  constructor() {
    effect(() => {
      const yearId = this.yearId();
      const teacherId = this.filterTeacherId();
      this.refresh();
      untracked(() => this.load(teacherId, yearId));
    });
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }

  load(teacherId: number | null = this.filterTeacherId(), yearId: number | null = this.yearId()): void {
    this.request?.unsubscribe();
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.request = this.leaveService.getAdjustments(teacherId, yearId).subscribe({
      next: (list) => {
        this.adjustments.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.adjustments.set([]);
        this.isLoading.set(false);
        this.loadFailed.set(true);
        this.toast.showError(err, 'Failed to load adjustments');
      },
    });
  }

  onFilterTeacher(value: number | null): void {
    this.filterTeacherId.set(value ? Number(value) : null);
  }

  save(): void {
    this.submitted.set(true);
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    this.isSaving.set(true);
    this.leaveService.createAdjustment({
      teacherId: Number(value.teacherId),
      leaveTypeId: Number(value.leaveTypeId),
      academicYearId: this.yearId(),
      days: Number(value.days),
      reason: value.reason.trim(),
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast.show('Adjustment saved.');
        this.submitted.set(false);
        this.form.patchValue({ days: null, reason: '' });
        this.changed.emit();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Failed to save the adjustment');
      },
    });
  }
}
