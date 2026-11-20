import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeacherService } from '../../teacher.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LoaderComponent } from '../../../shared/component/loader.component';
import { AuthService } from '../../../auth/auth.service';
import { ConfirmDialogComponent } from '../../../shared/component/confirm-dialog.component';
import { downloadCsv, toCsv } from '../../../shared/utils/csv.util';
import { todayIso } from '../../../shared/utils/date.util';
import { PagerComponent } from '../../../shared/component/pager.component';
import { createPaging } from '../../../shared/utils/paging.util';
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
  imports: [CommonModule, RouterModule, FormsModule, LoaderComponent, ConfirmDialogComponent, PagerComponent],
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

  teacherToDelete = signal<any | null>(null);
  isDeleting = signal<boolean>(false);

  filteredTeachers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.teachers();
    return this.teachers().filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.email.toLowerCase().includes(query)
    );
  });

  // The table shows one page at a time; search and Export CSV still use the whole filtered list.
  paging = createPaging(() => this.filteredTeachers(), () => this.searchQuery());

  ngOnInit(): void {
    this.loadTeachers();
  }

  exportCsv(): void {
    const rows = this.filteredTeachers();
    if (rows.length === 0) {
      this.toast.show('No teachers to export.', 'error');
      return;
    }
    const csv = toCsv([
      ['Name', 'Email', 'Subject', 'Qualification', 'Mobile'],
      ...rows.map(t => [t.name, t.email, t.subject, t.qualification, t.mobileNo])
    ]);
    downloadCsv(`teachers-${todayIso()}.csv`, csv);
  }

  loadTeachers(): void {
    this.isLoading.set(true);
    this.teacherService.getTeachers().subscribe({
      next: (data) => {
        this.teachers.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toast.showError(err, 'Failed to load teachers');
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
        this.toast.showError(err, 'Failed to load full teacher details');
      }
    });
  }

  closeViewModal() {
    this.isModalOpen.set(false);
    this.selectedTeacher.set(null);
  }

  deleteTeacher(): void {
    const target = this.teacherToDelete();
    if (!target) return;

    this.isDeleting.set(true);
    this.teacherService.deleteTeacher(target.id).subscribe({
      next: () => {
        this.teachers.update(list => list.filter(t => t.id !== target.id));
        this.toast.show('Teacher deleted successfully');
        this.cancelDelete();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toast.showError(err, 'Failed to delete teacher');
      }
    });
  }

  requestDelete(teacher: any): void {
    this.teacherToDelete.set(teacher);
  }

  cancelDelete(): void {
    this.teacherToDelete.set(null);
    this.isDeleting.set(false);
  }
}
