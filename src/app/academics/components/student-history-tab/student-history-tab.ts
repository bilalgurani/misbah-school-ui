import { Component, inject, Input, signal } from '@angular/core';
import { EnrollmentService } from '../../services/enrollment.service';
import { StudentEnrollment } from '../../models/enrollment.model';
import { CommonModule } from '@angular/common';
import { StudentExitRecord } from '../../models/student-exit.model';
import { StudentExitService } from '../../services/student-exit.service';
import { forkJoin } from 'rxjs';

@Component({
  imports: [CommonModule],
  selector: 'app-student-history-tab',
  styleUrls: ['./student-history-tab.scss', '../../shared/academic-shared.scss'],
  templateUrl: './student-history-tab.html',
})
export class StudentHistoryTab {
  @Input({ required: true }) studentId!: number;

  private enrollmentService = inject(EnrollmentService);
  private exitService = inject(StudentExitService);

  enrollments = signal<StudentEnrollment[]>([]);
  exitRecords = signal<StudentExitRecord[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    if (this.studentId) {
      forkJoin({
        history: this.enrollmentService.getHistory(this.studentId),
        exits: this.exitService.getExitRecords(this.studentId)
      }).subscribe({
        next: (res) => {
          this.enrollments.set(res.history);
          this.exitRecords.set(res.exits);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    }
  }
}
