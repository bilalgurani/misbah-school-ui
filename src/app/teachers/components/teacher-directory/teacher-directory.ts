import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeacherService } from '../../teacher.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LoaderComponent } from '../../../shared/component/loader.component';
import { AuthService } from '../../../auth/auth.service';
interface FullTeacherDto {
  id: string;
  name: string;
  email: string;
  mobileNo: string;
  dob: string;
  dateOfJoining: string;
  address: string;
  qualification: string;
  subject: string;
  employmentStatus: string;
}

@Component({
  imports: [CommonModule, RouterModule, FormsModule, LoaderComponent],
  selector: 'app-teacher-directory',
  styleUrl: './teacher-directory.scss',
  templateUrl: './teacher-directory.html',
})
export class TeacherDirectory {
  private teacherService = inject(TeacherService);
  private toast = inject(ToastService);
  public authService = inject(AuthService);

  teachers = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  searchQuery = signal<string>('');

  // Modal State Signals
  selectedTeacher = signal<FullTeacherDto | null>(null);
  isModalOpen = signal<boolean>(false);

  filteredTeachers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.teachers();
    return this.teachers().filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.email.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.loadTeachers();
  }

  loadTeachers(): void {
    this.isLoading.set(true);
    this.teacherService.getTeachers().subscribe({
      next: (data) => {
        this.teachers.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toast.show('Failed to load teachers', err);
        this.isLoading.set(false);
      }
    });
  }


  openViewModal(teacher: FullTeacherDto) {
    this.teacherService.getFullTeacherById(teacher.id).subscribe({
      next: (fullTeacher) => {
        this.selectedTeacher.set(fullTeacher);
        this.isModalOpen.set(true);
      },
      error: (err) => {
        this.toast.show('Failed to load full teacher details', err);
      }
    });
  }

  closeViewModal() {
    this.isModalOpen.set(false);
    this.selectedTeacher.set(null);
  }

  deleteTeacher(id: string): void {
    if (confirm('Are you sure you want to delete this teacher?')) {
      this.teacherService.deleteTeacher(id).subscribe({
        next: () => {
          this.teachers.update(list => list.filter(t => t.id !== id));
          this.toast.show('Teacher deleted successfully');
        },
        error: (err) => this.toast.show('Failed to delete teacher', err)
      });
    }
  }
}
