import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LeaveService, LeaveType } from '../../leave.service';
import { limitLabel } from '../../leave.util';
import { ToastService } from '../../../shared/services/toast.service';
import { LoaderComponent } from '../../../shared/component/loader.component';

@Component({
  imports: [ReactiveFormsModule, LoaderComponent],
  selector: 'app-leave-types-panel',
  styleUrl: './leave-types-panel.scss',
  templateUrl: './leave-types-panel.html',
})
export class LeaveTypesPanel {
  private fb = inject(FormBuilder);
  private leaveService = inject(LeaveService);
  private toast = inject(ToastService);

  types = input.required<LeaveType[]>();
  loading = input<boolean>(false);
  changed = output<void>();

  readonly limitLabel = limitLabel;

  editingId = signal<number | null>(null);
  submitted = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    daysPerYear: [0, [Validators.required, Validators.min(0)]],
    paid: [true],
    unlimited: [false],
    active: [true],
  });

  onUnlimitedChange(): void {
    const control = this.form.controls.daysPerYear;
    if (this.form.controls.unlimited.value) {
      control.setValue(0);
      control.disable();
    } else {
      control.enable();
    }
  }

  edit(type: LeaveType): void {
    this.editingId.set(type.id);
    this.submitted.set(false);
    this.form.reset({
      name: type.name,
      daysPerYear: type.daysPerYear,
      paid: type.paid,
      unlimited: type.unlimited,
      active: type.active,
    });
    this.onUnlimitedChange();
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.submitted.set(false);
    this.form.reset({ name: '', daysPerYear: 0, paid: true, unlimited: false, active: true });
    this.onUnlimitedChange();
  }

  save(): void {
    this.submitted.set(true);
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const body = {
      name: value.name.trim(),
      daysPerYear: value.unlimited ? 0 : Number(value.daysPerYear),
      paid: value.paid,
      unlimited: value.unlimited,
    };
    const id = this.editingId();

    this.isSaving.set(true);
    const request = id === null
      ? this.leaveService.createType(body)
      : this.leaveService.updateType(id, { ...body, active: value.active });
    request.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast.show(id === null ? 'Leave type added.' : 'Leave type updated.');
        this.cancelEdit();
        this.changed.emit();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Failed to save the leave type');
      },
    });
  }
}
