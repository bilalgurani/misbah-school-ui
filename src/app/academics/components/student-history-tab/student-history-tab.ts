import { Component, inject, input, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { EnrollmentService } from '../../services/enrollment.service';
import { StudentExitService } from '../../services/student-exit.service';
import { StudentEnrollment } from '../../models/enrollment.model';
import { StudentExitRecord } from '../../models/student-exit.model';

@Component({
  selector: 'app-student-history-tab',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./student-history-tab.scss', '../../shared/academic-shared.scss'],
  templateUrl: './student-history-tab.html',
})
export class StudentHistoryTab {
  // Fix: Make studentId optional (number | undefined) instead of required
  studentId = input<number, string | number | undefined>(undefined, {
    transform: (v) => (v ? Number(v) : undefined)
  });

  private enrollmentService = inject(EnrollmentService);
  private exitService = inject(StudentExitService);

  enrollments = signal<StudentEnrollment[]>([]);
  exitRecords = signal<StudentExitRecord[]>([]);
  isLoading = signal<boolean>(false);

  constructor() {
    effect(() => {
      const id = this.studentId();
      
      if (!id || isNaN(id)) {
        this.enrollments.set([]);
        this.exitRecords.set([]);
        this.isLoading.set(false);
        return;
      }

      this.isLoading.set(true);
      forkJoin({
        history: this.enrollmentService.getHistory(id),
        exits: this.exitService.getExitRecords(id)
      }).subscribe({
        next: (res) => {
          this.enrollments.set(res.history);
          this.exitRecords.set(res.exits);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load student history:', err);
          this.isLoading.set(false);
        }
      });
    });
  }

  formatEnum(val?: string): string {
    if (!val) return 'N/A';
    return val.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
}