import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudentExitRequestDto } from '../../models/student-exit.model';
import { StudentExitService } from '../../services/student-exit.service';
import { AcademicYearService } from '../../services/academic-year.service';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-exit-student-modal',
  styleUrls: ['./exit-student-modal.scss', '../../shared/academic-shared.scss'],
  templateUrl: './exit-student-modal.html',
})
export class ExitStudentModal implements OnInit {
  @Input({ required: true }) studentId!: number;
  @Input() currentEnrollmentId?: number | null;
  @Input() academicYearId?: number | null;

  @Output() closed = new EventEmitter<boolean>();

  private exitService = inject(StudentExitService);
  private academicYearService = inject(AcademicYearService);

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
        error: (err) => console.error('Failed to load active academic year', err)
      });
    }
  }

  submitExit(): void {
    const payload: StudentExitRequestDto = {
      ...this.form,
      currentEnrollmentId: this.form.currentEnrollmentId || Number(this.currentEnrollmentId) || 0,
      academicYearId: this.form.academicYearId || Number(this.academicYearId) || 0,
    };

    this.exitService.recordExit(this.studentId, payload).subscribe({
      next: () => this.closed.emit(true),
      error: (err) => console.error('Failed to record exit', err)
    });
  }

  cancel(): void {
    this.closed.emit(false);
  }
}