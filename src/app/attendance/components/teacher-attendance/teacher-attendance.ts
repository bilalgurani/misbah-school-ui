import { Component, computed, inject, signal } from '@angular/core';
import { AttendanceApiService } from '../../services/attendance-api.service';
import { LocalTeacherUI, MarkTeacherAttendanceRequest } from '../../models/attendance.models';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  imports: [FormsModule],
  selector: 'app-teacher-attendance',
  styleUrl: './teacher-attendance.scss',
  templateUrl: './teacher-attendance.html',
})
export class TeacherAttendance {
  private api = inject(AttendanceApiService);
  private toast = inject(ToastService);

  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);

  teachers = signal<LocalTeacherUI[]>([]);
  searchQuery = signal<string>('');
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);


  // Derived counts
  presentCount = computed(() => this.teachers().filter(t => t.status === 'PRESENT').length);
  absentCount = computed(() => this.teachers().filter(t => t.status === 'ABSENT').length);

  filteredTeachers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.teachers();

    return this.teachers().filter(
      t => t.name.toLowerCase().includes(query) || t.teacherId.toLowerCase().includes(query)
    );
  });

  ngOnInit() {
    this.fetchAttendanceOrTeachers();
  }

  onFilterChange() {
    this.fetchAttendanceOrTeachers();
  }

  fetchAttendanceOrTeachers() {
    const date = this.selectedDate();
    if (!date) return;

    this.isLoading.set(true);

    // 1. Try loading existing teacher attendance for this date
    // Note: You will need to create this method in your AttendanceApiService
    this.api.getTeacherAttendance(date).subscribe({
      next: (records) => {
        if (records && records.length > 0) {
          const mapped = records.map((r: any) => ({
            id: r.teacherId,
            teacherId: r.teacherId,
            name: r.teacherName,
            status: r.status
          }));
          this.teachers.set(mapped);
          this.isLoading.set(false);
        } else {
          // 2. Fall back to raw teacher list if attendance isn't marked yet
          this.loadDefaultRoster();
        }
      },
      error: () => {
        this.loadDefaultRoster();
      }
    });
  }

  private loadDefaultRoster() {
    // Note: You will need to create this method in your AttendanceApiService
    this.api.getAllTeachers().subscribe({
      next: (teacherDtos: any[]) => {
        const defaultList: LocalTeacherUI[] = teacherDtos.map(t => ({
          id: t.id,
          teacherId: t.teacherId || `EMP-${t.id}`, // fallback if no employee ID
          name: t.name,
          status: 'PRESENT' // Default status
        }));
        this.teachers.set(defaultList);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load teachers', err);
        this.isLoading.set(false);
        this.toast.show('Failed to load teacher roster.', 'error');
      }
    });
  }

  setStatus(id: number, status: 'PRESENT' | 'ABSENT') {
    this.teachers.update(list =>
      list.map(t => t.id === id ? { ...t, status } : t)
    );
  }

  markAll(status: 'PRESENT' | 'ABSENT') {
    this.teachers.update(list => list.map(t => ({ ...t, status })));
  }

  submitAttendance() {
    const date = this.selectedDate();
    if (!date) return;

    const payload: MarkTeacherAttendanceRequest = {
      date: date,
      entries: this.teachers().map(t => ({
        teacherId: t.id,
        status: t.status
      }))
    };

    this.isSubmitting.set(true);
    // Note: You will need to create this method in your AttendanceApiService
    this.api.saveTeacherAttendance(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.show('Teacher attendance saved successfully!', 'success');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.show('Error saving teacher attendance. Please try again.', 'error');
      }
    });
  }
  
}
