import { Component, inject, OnInit, signal } from '@angular/core';
import { AcademicYearService } from '../../services/academic-year.service';
import { AcademicYear } from '../../models/academic-year.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '../../../shared/component/loader.component';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  imports: [CommonModule, FormsModule, LoaderComponent],
  selector: 'app-academic-years',
  styleUrls: ['./academic-years.scss', '../../shared/academic-shared.scss'],
  templateUrl: './academic-years.html',
})
export class AcademicYears implements OnInit {
  private yearService = inject(AcademicYearService);
  public toast = inject(ToastService);

  academicYears = signal<AcademicYear[]>([]);
  isLoading = signal<boolean>(true);
  showModal = signal<boolean>(false);

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
      error: () => this.isLoading.set(false)
    });
  }

  markAsCurrent(id: number): void {
    this.yearService.setCurrent(id).subscribe(() => this.loadYears());
  }

  openCreateModal(): void {
    this.newYear = { name: '', startDate: '', endDate: '' };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveYear(): void {
    if (!this.newYear.name || !this.newYear.startDate || !this.newYear.endDate) return;
    this.yearService.create(this.newYear).subscribe({
      next: () => {
        this.closeModal();
        this.loadYears();
        this.toast.show('Academic year created successfully.');
      },
      error: () => {
        this.toast.show('Failed to create academic year. Please try again.');
      }
    });
  }
}
