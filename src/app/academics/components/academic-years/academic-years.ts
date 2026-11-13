import { Component, inject, OnInit, signal } from '@angular/core';
import { AcademicYearService } from '../../services/academic-year.service';
import { AcademicYear } from '../../models/academic-year.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '../../../shared/component/loader.component';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmDialogComponent } from '../../../shared/component/confirm-dialog.component';

@Component({
  imports: [CommonModule, FormsModule, LoaderComponent, ConfirmDialogComponent],
  selector: 'app-academic-years',
  styleUrls: ['../../shared/academic-shared.scss', './academic-years.scss'],
  templateUrl: './academic-years.html',
})
export class AcademicYears implements OnInit {
  private yearService = inject(AcademicYearService);
  public toast = inject(ToastService);

  academicYears = signal<AcademicYear[]>([]);
  isLoading = signal<boolean>(true);
  showModal = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  yearToDelete = signal<AcademicYear | null>(null);
  isDeleting = signal<boolean>(false);

  newYear: AcademicYear = { name: '', startDate: '', endDate: '' };

  ngOnInit(): void {
    this.loadYears();
  }

  loadYears(): void {
    this.isLoading.set(true);
    this.yearService.getAll().subscribe({
      next: (data) => {
        this.academicYears.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.showError(err, 'Failed to load academic years.');
      }
    });
  }

  markAsCurrent(id: number): void {
    this.yearService.setCurrent(id).subscribe({
      next: () => {
        this.toast.show('Current academic year updated.');
        this.loadYears();
      },
      error: (err) => this.toast.showError(err, 'Failed to set the current academic year.')
    });
  }

  requestDelete(year: AcademicYear): void {
    this.yearToDelete.set(year);
  }

  cancelDelete(): void {
    this.yearToDelete.set(null);
    this.isDeleting.set(false);
  }

  deleteYear(): void {
    const target = this.yearToDelete();
    if (!target?.id) return;

    this.isDeleting.set(true);
    this.yearService.delete(target.id).subscribe({
      next: () => {
        this.academicYears.update(list => list.filter(y => y.id !== target.id));
        this.toast.show('Academic year deleted successfully.');
        this.cancelDelete();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toast.showError(err, 'Failed to delete academic year.');
      }
    });
  }

  openCreateModal(): void {
    this.newYear = { name: '', startDate: '', endDate: '' };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveYear(): void {
    if (!this.newYear.name?.trim() || !this.newYear.startDate || !this.newYear.endDate) {
      this.toast.show('Please fill in the year name, start date and end date.', 'error');
      return;
    }
    if (this.newYear.endDate <= this.newYear.startDate) {
      this.toast.show('End date must be after the start date.', 'error');
      return;
    }

    this.isSaving.set(true);
    this.yearService.create(this.newYear).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeModal();
        this.loadYears();
        this.toast.show('Academic year created successfully.');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Failed to create academic year. Please try again.');
      }
    });
  }
}
