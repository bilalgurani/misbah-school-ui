import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StudentService } from '../../student.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LoaderComponent } from '../../../shared/component/loader.component';
import { AuthService } from '../../../auth/auth.service';
import { ExitStudentModal } from '../../../academics/components/exit-student-modal/exit-student-modal';

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
  imports: [FormsModule, RouterModule, LoaderComponent, ExitStudentModal],
  selector: 'app-student-directory',
  styleUrl: './student-directory.scss',
  templateUrl: './student-directory.html',
})
export class StudentDirectory {
  private studentService = inject(StudentService);
  private toast = inject(ToastService);
  public authService = inject(AuthService);

  students = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  searchQuery = signal<string>('');

  selectedStudent = signal<FullStudentDto | null>(null);
  isModalOpen = signal<boolean>(false);

  isExitModalOpen = signal<boolean>(false);
  selectedStudentForExit = signal<any | null>(null);

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
  }

  loadStudents(): void {
    this.isLoading.set(true);
    this.studentService.getStudents().subscribe({
      next: (data) => {
        this.students.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toast.show('Failed to load students', err);
        this.isLoading.set(false);
      }
    });
  }

  openViewModal(student: FullStudentDto) {
    this.studentService.getFullStudentById(student.id).subscribe({
      next: (fullStudent) => {
        this.selectedStudent.set(fullStudent);
        this.isModalOpen.set(true);
      },
      error: (err) => {
        this.toast.show('Failed to load full student details', err);
      }
    });
  }

  closeViewModal() {
    this.isModalOpen.set(false);
    this.selectedStudent.set(null);
  }

  deleteStudent(id: string): void {
    if (confirm('Are you sure you want to delete this student?')) {
      this.studentService.deleteStudent(id).subscribe({
        next: () => {
          this.students.update(list => list.filter(s => s.id !== id));
          this.toast.show('Student deleted successfully');
        },
        error: (err) => this.toast.show('Failed to delete student', err)
      });
    }
  }
}
