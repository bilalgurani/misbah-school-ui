import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { FeeService, ClassLevel, FeeInstallment } from '../fee.service';
import { AcademicYearService } from '../../academics/services/academic-year.service';
import { AcademicYear } from '../../academics/models/academic-year.model';
import { ToastService } from '../../shared/services/toast.service';
import { LoaderComponent } from '../../shared/component/loader.component';
import { ConfirmDialogComponent } from '../../shared/component/confirm-dialog.component';
import { InrPipe } from '../utils/inr.pipe';

@Component({
  imports: [ReactiveFormsModule, FormsModule, DatePipe, InrPipe, LoaderComponent, ConfirmDialogComponent],
  selector: 'app-fee-setup',
  styleUrl: './fee-setup.scss',
  templateUrl: './fee-setup.html',
})
export class FeeSetup implements OnInit {
  private fb = inject(FormBuilder);
  private feeService = inject(FeeService);
  private yearService = inject(AcademicYearService);
  private toast = inject(ToastService);

  classLevels = signal<ClassLevel[]>([]);
  academicYears = signal<AcademicYear[]>([]);
  installments = signal<FeeInstallment[]>([]);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);

  filterYearId = signal<number | null>(null);
  filterLevelId = signal<number | null>(null);
  selectedLevelIds = signal<number[]>([]);
  submitted = signal<boolean>(false);

  installmentToDelete = signal<FeeInstallment | null>(null);
  isDeleting = signal<boolean>(false);

  allSelected = computed(() =>
    this.classLevels().length > 0 && this.selectedLevelIds().length === this.classLevels().length);

  form = this.fb.nonNullable.group({
    academicYearId: this.fb.control<number | null>(null),
    name: ['', [Validators.required, Validators.maxLength(100)]],
    amount: [0, [Validators.required, Validators.min(1)]],
    dueDate: ['', Validators.required],
  });

  ngOnInit(): void {
    this.feeService.getClassLevels().subscribe({
      next: (levels) => this.classLevels.set(levels),
      error: (err) => this.toast.showError(err, 'Failed to load class levels'),
    });
    this.yearService.getAll().subscribe({
      next: (years) => this.academicYears.set(years),
      error: (err) => this.toast.showError(err, 'Failed to load academic years'),
    });
    this.loadInstallments();
  }

  loadInstallments(): void {
    this.isLoading.set(true);
    this.feeService.getInstallments(this.filterYearId(), this.filterLevelId()).subscribe({
      next: (data) => {
        this.installments.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.showError(err, 'Failed to load fee installments');
      },
    });
  }

  onFilterYear(value: number | null): void {
    this.filterYearId.set(value ? Number(value) : null);
    this.loadInstallments();
  }

  onFilterLevel(value: number | null): void {
    this.filterLevelId.set(value ? Number(value) : null);
    this.loadInstallments();
  }

  isLevelSelected(id: number): boolean {
    return this.selectedLevelIds().includes(id);
  }

  toggleLevel(id: number): void {
    this.selectedLevelIds.update(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }

  toggleAllLevels(): void {
    this.selectedLevelIds.set(this.allSelected() ? [] : this.classLevels().map(l => l.id));
  }

  create(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.selectedLevelIds().length === 0) return;

    const value = this.form.getRawValue();
    this.isSaving.set(true);
    this.feeService.createInstallments({
      academicYearId: value.academicYearId ? Number(value.academicYearId) : null,
      classLevelIds: this.selectedLevelIds(),
      name: value.name.trim(),
      amount: Number(value.amount),
      dueDate: value.dueDate,
    }).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.toast.show(`Created ${res.ids?.length ?? this.selectedLevelIds().length} installment(s).`);
        this.form.patchValue({ name: '', amount: 0, dueDate: '' });
        this.selectedLevelIds.set([]);
        this.submitted.set(false);
        this.loadInstallments();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Failed to create installments');
      },
    });
  }

  requestDelete(item: FeeInstallment): void {
    this.installmentToDelete.set(item);
  }

  cancelDelete(): void {
    this.installmentToDelete.set(null);
    this.isDeleting.set(false);
  }

  deleteInstallment(): void {
    const target = this.installmentToDelete();
    if (!target) return;

    this.isDeleting.set(true);
    this.feeService.deleteInstallment(target.id).subscribe({
      next: () => {
        this.installments.update(list => list.filter(i => i.id !== target.id));
        this.toast.show('Installment deleted successfully.');
        this.cancelDelete();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toast.showError(err, 'Failed to delete installment');
      },
    });
  }
}
