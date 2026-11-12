import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnrollmentService } from '../../services/enrollment.service';
import { AcademicYearService } from '../../services/academic-year.service';
import { AcademicYear } from '../../models/academic-year.model';
import { PromotionItemDto } from '../../models/enrollment.model';
import { AttendanceApiService } from '../../../attendance/services/attendance-api.service';
import { ClassSection } from '../../../attendance/models/attendance.models';
import { ToastService } from '../../../shared/services/toast.service';

interface StudentPromotionRow extends PromotionItemDto {
  studentName: string;
  currentRollNo: string;
}

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-promote-students',
  styleUrls: ['./promote-students.scss', '../../shared/academic-shared.scss'],
  templateUrl: './promote-students.html',
})
export class PromoteStudents implements OnInit {
  private enrollmentService = inject(EnrollmentService);
  private yearService = inject(AcademicYearService);
  private attendanceApi = inject(AttendanceApiService);
  private toast = inject(ToastService);

  academicYears = signal<AcademicYear[]>([]);
  classSections = signal<ClassSection[]>([]);

  sourceSectionId = signal<number | null>(null);
  targetYearId = signal<number | null>(null);

  students = signal<StudentPromotionRow[]>([]);
  isSubmitting = signal<boolean>(false);
  isLoadingStudents = signal<boolean>(false);

  ngOnInit(): void {
    // Fetch academic years
    this.yearService.getAll().subscribe({
      next: years => this.academicYears.set(years),
      error: err => this.toast.showError(err, 'Failed to load academic years.')
    });

    // Fetch class sections using AttendanceApiService
    this.attendanceApi.getClassSections().subscribe({
      next: sections => this.classSections.set(sections),
      error: err => this.toast.showError(err, 'Failed to load classes.')
    });
  }

  onSourceSectionChange(sectionId: number | null): void {
    this.sourceSectionId.set(sectionId);
    if (!sectionId) {
      this.students.set([]);
      return;
    }
    this.loadActiveStudents(sectionId);
  }

  loadActiveStudents(sectionId: number): void {
    this.isLoadingStudents.set(true);

    this.enrollmentService.getActiveEnrollmentsBySection(sectionId).subscribe({
      next: (enrollments: any[]) => {
        const mappedStudents: StudentPromotionRow[] = enrollments.map((e) => {
          // Extracts single name field directly from API response
          const studentName = e.studentName ?? e.name ?? e.student?.name ?? `Student #${e.studentId}`;
          const rollNumber = e.rollNo ?? e.rollNumber ?? '';

          return {
            studentId: e.studentId ?? e.student?.id,
            currentEnrollmentId: e.id,
            studentName: studentName,
            currentRollNo: rollNumber,
            targetClassSectionId: sectionId,
            targetRollNo: rollNumber,
            outcome: 'PROMOTED'
          };
        });

        this.students.set(mappedStudents);
        this.isLoadingStudents.set(false);
      },
      error: (err) => {
        this.toast.showError(err, 'Failed to load students.');
        this.students.set([]);
        this.isLoadingStudents.set(false);
      }
    });
  }

  submitPromotions(): void {
    const targetYr = Number(this.targetYearId());
    if (!targetYr || this.students().length === 0) {
      this.toast.show('Please select a target academic year.', 'error');
      return;
    }

    const hasInvalidTarget = this.students().some(s => !s.targetClassSectionId);
    if (hasInvalidTarget) {
      this.toast.show('Please select a target class section for all students before submitting.', 'error');
      return;
    }

    this.isSubmitting.set(true);

    const payload = {
      targetAcademicYearId: targetYr,
      items: this.students().map((s) => ({
        studentId: Number(s.studentId),
        currentEnrollmentId: Number(s.currentEnrollmentId),
        targetClassSectionId: Number(s.targetClassSectionId),
        targetRollNo: String(s.targetRollNo ?? ''),
        outcome: s.outcome
      }))
    };

    this.enrollmentService.promoteOrDetain(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.show('Promotions processed successfully!');
        this.students.set([]);
        this.sourceSectionId.set(null);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.showError(err, 'Failed to process promotions.');
      }
    });
  }
}