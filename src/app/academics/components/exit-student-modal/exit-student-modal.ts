import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudentExitRequestDto } from '../../models/student-exit.model';
import { StudentExitService } from '../../services/student-exit.service';
import { AcademicYearService } from '../../services/academic-year.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-exit-student-modal',
  styleUrls: ['../../shared/academic-shared.scss', './exit-student-modal.scss'],
  templateUrl: './exit-student-modal.html',
})
export class ExitStudentModal implements OnInit {
  @Input({ required: true }) studentId!: number;
  @Input() currentEnrollmentId?: number | null;
  @Input() academicYearId?: number | null;

  @Output() closed = new EventEmitter<boolean>();

  private exitService = inject(StudentExitService);
  private academicYearService = inject(AcademicYearService);
  private toast = inject(ToastService);
  isSubmitting = false;

  form: StudentExitRequestDto = {
    currentEnrollmentId: 0,
    academicYearId: 0,
    exitDate: new Date().toISOString().substring(0, 10),
    exitType: 'TRANSFERRED_OUT',
    reasonCategory: 'FAMILY_RELOCATION',
    reasonNotes: '',
    destinationSchool: '',
    tcNumber: '',
    tcIssuedOn: ''
  };

  ngOnInit(): void {
    // Set enrollment ID
    if (this.currentEnrollmentId) {
      this.form.currentEnrollmentId = Number(this.currentEnrollmentId);
    }

    // Resolve academic year ID from input or backend service
    if (this.academicYearId) {
      this.form.academicYearId = Number(this.academicYearId);
    } else {
      this.academicYearService.getCurrent().subscribe({
        next: (year) => {
          if (year?.id) {
            this.form.academicYearId = year.id;
          }
        },
        error: (err) => this.toast.showError(err, 'Failed to load the current academic year.')
      });
    }
  }

  submitExit(): void {
    const payload: StudentExitRequestDto = {
      ...this.form,
      currentEnrollmentId: this.form.currentEnrollmentId || Number(this.currentEnrollmentId) || 0,
      academicYearId: this.form.academicYearId || Number(this.academicYearId) || 0,
    };

    if (!payload.currentEnrollmentId || !payload.academicYearId) {
      this.toast.show('Missing enrollment or academic year for this student.', 'error');
      return;
    }
    if (!payload.exitDate) {
      this.toast.show('Please choose an exit date.', 'error');
      return;
    }

    this.isSubmitting = true;
    this.exitService.recordExit(this.studentId, payload).subscribe({
      next: () => {
        this.toast.show('Exit recorded successfully.');
        this.closed.emit(true);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.showError(err, 'Failed to record exit.');
      }
    });
  }

  cancel(): void {
    this.closed.emit(false);
  }
}