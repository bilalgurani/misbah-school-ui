import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StudentService } from '../../student.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LoaderComponent } from '../../../shared/component/loader.component';
import { AuthService } from '../../../auth/auth.service';
import { ExitStudentModal } from '../../../academics/components/exit-student-modal/exit-student-modal';
import { ConfirmDialogComponent } from '../../../shared/component/confirm-dialog.component';
import { AttendanceApiService } from '../../../attendance/services/attendance-api.service';
import { ClassSection } from '../../../attendance/models/attendance.models';
import { downloadCsv, toCsv } from '../../../shared/utils/csv.util';
import { todayIso } from '../../../shared/utils/date.util';
import { AttendanceTrendComponent } from '../../../shared/component/attendance-trend.component';
import { ChangeSectionModal } from '../change-section-modal/change-section-modal';
import { AttendanceTrendService, StudentStatMap } from '../../../attendance/services/attendance-trend.service';
interface FullStudentDto {
  id: number;
  name: string;
  rollNo: number | null;
  satsNo: string | null;
  gender: string | null;
  fatherName: string | null;
  motherName: string | null;
  dob: string | null;
  aadharNo: string | null;
  address: string | null;
  mobileNo: string | null;
  dateOfAdmission: string | null;
  bloodGroup: string | null;
  emergencyContactName: string | null;
  emergencyContactNo: string | null;
  enrollmentStatus: 'ACTIVE' | 'INACTIVE' | 'ALUMNI' | string;
  classSectionId: number | null;
  
  // ADD THESE TWO PROPERTIES:
  currentEnrollmentId?: number | null;
  currentAcademicYearId?: number | null;
}

@Component({
  imports: [FormsModule, RouterModule, LoaderComponent, ExitStudentModal, ConfirmDialogComponent, AttendanceTrendComponent, ChangeSectionModal],
  selector: 'app-student-directory',
  styleUrl: './student-directory.scss',
  templateUrl: './student-directory.html',
})
export class StudentDirectory {
  private studentService = inject(StudentService);
  private toast = inject(ToastService);
  private attendanceApi = inject(AttendanceApiService);
  private trendService = inject(AttendanceTrendService);
  public authService = inject(AuthService);

  students = signal<any[]>([]);
  attendanceStats = signal<StudentStatMap>(new Map());
  isAttendanceLoading = signal<boolean>(false);
  private loadedStatsKey = '';
  classSections = signal<ClassSection[]>([]);
  isLoading = signal<boolean>(false);
  searchQuery = signal<string>('');
  selectedStudent = signal<FullStudentDto | null>(null);
  isModalOpen = signal<boolean>(false);

  isExitModalOpen = signal<boolean>(false);
  selectedStudentForExit = signal<any | null>(null);

  studentToDelete = signal<any | null>(null);
  isDeleting = signal<boolean>(false);

  studentToMove = signal<any | null>(null);

  onMoveClosed(moved: boolean): void {
    this.studentToMove.set(null);
    if (moved) this.loadStudents();
  }

  studentToReadmit = signal<any | null>(null);
  isReadmitting = signal<boolean>(false);

  requestReadmit(student: any): void {
    this.closeViewModal();
    this.studentToReadmit.set(student);
  }

  cancelReadmit(): void {
    this.studentToReadmit.set(null);
    this.isReadmitting.set(false);
  }

  readmitStudent(): void {
    const target = this.studentToReadmit();
    if (!target) return;

    this.isReadmitting.set(true);
    this.studentService.readmitStudent(target.id).subscribe({
      next: () => {
        this.toast.show(`${target.name} has been re-admitted.`);
        this.cancelReadmit();
        this.loadStudents();
      },
      error: (err) => {
        this.isReadmitting.set(false);
        this.toast.showError(err, 'Failed to re-admit the student.');
      }
    });
  }

  openExitModal(student: FullStudentDto): void {
    const targetStudent = this.selectedStudent() || student;

    this.closeViewModal(); 
    this.selectedStudentForExit.set(targetStudent);
    this.isExitModalOpen.set(true);
  }

  onExitModalClosed(submitted: boolean): void {
    this.isExitModalOpen.set(false);
    this.selectedStudentForExit.set(null);
    if (submitted) {
      this.loadStudents(); // Refresh table list
    }
  }

  filteredStudents = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.students();
    return this.students().filter(s =>
      s.name.toLowerCase().includes(query) ||
      (s.rollNo && s.rollNo.toString().toLowerCase().includes(query))
    );
  });

  ngOnInit(): void {
    this.loadStudents();
    this.attendanceApi.getClassSections().subscribe({
      next: (sections) => {
        this.classSections.set(sections);
        this.loadAttendanceStats();
      },
      error: () => this.classSections.set([])
    });
  }

  exportCsv(): void {
    const rows = this.filteredStudents();
    if (rows.length === 0) {
      this.toast.show('No students to export.', 'error');
      return;
    }
    const sectionNames = new Map(this.classSections().map(s => [s.id, s.displayName]));
    const genderLabel = (g: string | null) => g === 'M' ? 'Male' : g === 'F' ? 'Female' : g ? 'Other' : '';
    const csv = toCsv([
      ['Name', 'Roll No', 'Class', 'Gender', 'Mobile', 'Status'],
      ...rows.map(s => [
        s.name,
        s.rollNo,
        sectionNames.get(s.classSectionId) ?? s.classSectionId,
        genderLabel(s.gender),
        s.mobileNo,
        s.enrollmentStatus
      ])
    ]);
    downloadCsv(`students-${todayIso()}.csv`, csv);
  }

  loadStudents(): void {
    this.isLoading.set(true);
    this.studentService.getStudents().subscribe({
      next: (data) => {
        this.students.set(data);
        this.isLoading.set(false);
        this.loadAttendanceStats();
      },
      error: (err) => {
        this.toast.showError(err, 'Failed to load students');
        this.isLoading.set(false);
      }
    });
  }

  // Loaded in the background so the list itself is never held up by attendance. The students list gives each
  // student's class as a name ("5 - A"), so the real section ids come from the class list, which loads separately.
  private loadAttendanceStats(): void {
    const students = this.students();
    const sections = this.classSections();
    if (students.length === 0 || sections.length === 0) return;

    const idByName = new Map(sections.map(s => [s.displayName, s.id]));
    const sectionIds = [...new Set(
      students
        .filter(s => s.enrollmentStatus === 'ACTIVE')
        .map(s => idByName.get(String(s.classSectionId)))
        .filter((id): id is number => id !== undefined),
    )];
    const key = sectionIds.join(',');
    if (key === this.loadedStatsKey) return;
    this.loadedStatsKey = key;

    this.isAttendanceLoading.set(sectionIds.length > 0);
    this.trendService.getManySectionStats(sectionIds, new Date()).subscribe({
      next: stats => {
        this.attendanceStats.set(stats);
        this.isAttendanceLoading.set(false);
      },
      error: () => this.isAttendanceLoading.set(false),
    });
  }

  openViewModal(student: FullStudentDto) {
    this.studentService.getFullStudentById(student.id).subscribe({
      next: (fullStudent) => {
        this.selectedStudent.set(fullStudent);
        this.isModalOpen.set(true);
      },
      error: (err) => {
        this.toast.showError(err, 'Failed to load full student details');
      }
    });
  }

  closeViewModal() {
    this.isModalOpen.set(false);
    this.selectedStudent.set(null);
  }

  deleteStudent(): void {
    const target = this.studentToDelete();
    if (!target) return;

    this.isDeleting.set(true);
    this.studentService.deleteStudent(target.id).subscribe({
      next: () => {
        this.students.update(list => list.filter(s => s.id !== target.id));
        this.toast.show('Student deleted successfully');
        this.cancelDelete();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toast.showError(err, 'Failed to delete student');
      }
    });
  }

  requestDelete(student: any): void {
    this.studentToDelete.set(student);
  }

  cancelDelete(): void {
    this.studentToDelete.set(null);
    this.isDeleting.set(false);
  }
}
