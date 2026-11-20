import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { AttendanceApiService } from "../../services/attendance-api.service";
import { ClassSection, LocalStudentUI, MarkAttendanceRequest, AttendanceMarker } from "../../models/attendance.models";
import { ToastService } from "../../../shared/services/toast.service";
import { ActivatedRoute } from "@angular/router";
import { LoaderComponent } from "../../../shared/component/loader.component";
import { AbsenceAlert } from "../../../messaging/absence-alert/absence-alert";
import { AttendanceTrendComponent } from "../../../shared/component/attendance-trend.component";
import { AttendanceTrendService, StudentStatMap } from "../../services/attendance-trend.service";
import { toMonthKey } from "../../attendance-trend.util";
import { AuthService } from "../../../auth/auth.service";
import { ConfirmDialogComponent } from "../../../shared/component/confirm-dialog.component";
import { DatePipe } from "@angular/common";

@Component({
  imports: [FormsModule, DatePipe, AbsenceAlert, LoaderComponent, AttendanceTrendComponent, ConfirmDialogComponent],
  selector: 'app-student-attendance',
  styleUrl: './student-attendance.scss',
  templateUrl: './student-attendance.html',
})
export class StudentAttendance implements OnInit {

  private api = inject(AttendanceApiService);
  protected authService = inject(AuthService);
  private trendService = inject(AttendanceTrendService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private trendKey = '';

  attendanceStats = signal<StudentStatMap>(new Map());
  
  classSections = signal<ClassSection[]>([]);
  selectedSectionId = signal<number | null>(null);
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);

  students = signal<LocalStudentUI[]>([]);
  searchQuery = signal<string>('');
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  attendanceSaved = signal<boolean>(false);
  savedOnServer = signal<boolean>(false);
  // Who last saved this class's attendance for the chosen day; null when nothing is saved.
  marker = signal<AttendanceMarker | null>(null);
  confirmingClear = signal<boolean>(false);


// Derived counts
  presentCount = computed(() => this.students().filter(s => s.status === 'PRESENT').length);
  absentCount = computed(() => this.students().filter(s => s.status === 'ABSENT').length);
  absentees = computed(() =>
    this.students().filter(s => s.status === 'ABSENT').map(s => ({ id: s.id, name: s.name })));

  // Get the display name of the selected section for the empty state message
selectedSectionName = computed(() => {
  const currentId = this.selectedSectionId();
  const section = this.classSections().find(s => s.id === currentId);
  return section ? section.displayName : '';
});

  filteredStudents = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.students();

    return this.students().filter(
      s => s.name.toLowerCase().includes(query) || s.rollNo.toString().toLowerCase().includes(query)
    );
  });

  ngOnInit() {
    this.loadSections();
  }

  loadSections() {
    this.api.getClassSections().subscribe({
      next: (sections) => {
        this.classSections.set(sections);
        if (sections.length > 0) {
          // 3. Read query param from the URL
          const paramId = this.route.snapshot.queryParamMap.get('classSectionId');
          const targetId = paramId ? Number(paramId) : null;

          // Check if the passed section ID exists in the fetched sections
          const matchedSection = sections.find(s => s.id === targetId);

          if (matchedSection) {
            this.selectedSectionId.set(matchedSection.id);
          } else {
            this.selectedSectionId.set(sections[0].id); // Fallback to first section
          }
          
          this.fetchAttendanceOrStudents();
        }
      },
      error: (err) => this.toast.showError(err, 'Failed to load sections')
    });
  }

  onFilterChange() {
    this.fetchAttendanceOrStudents();
  }

  fetchAttendanceOrStudents() {
    const sectionId = this.selectedSectionId();
    const date = this.selectedDate();
    if (!sectionId || !date) return;

    this.isLoading.set(true);
    this.attendanceSaved.set(false);
    this.savedOnServer.set(false);
    this.marker.set(null);
    this.loadTrend(sectionId, date);

    // 1. Try loading existing attendance record first
    this.api.getAttendance(sectionId, date).subscribe({
      next: (records) => {
        if (records && records.length > 0) {
          // Map existing attendance records
          const mapped = records.map(r => ({
            id: r.studentId,
            rollNo: r.rollNo,
            name: r.studentName,
            status: r.status
          }));
          this.students.set(mapped);
          this.attendanceSaved.set(true);
          this.savedOnServer.set(records.some(r => !!r.status));
          if (this.savedOnServer()) this.loadMarker(sectionId, date);
          this.isLoading.set(false);
        } else {
          // 2. Fall back to raw student roster if attendance isn't marked yet
          this.loadDefaultRoster(sectionId);
        }
      },
      error: () => {
        this.loadDefaultRoster(sectionId);
      }
    });
  }

  // Purely informational: if it can't be loaded the screen just doesn't show the "Taken by" line.
  private loadMarker(sectionId: number, date: string) {
    this.api.getMarkers(date).subscribe({
      next: markers => {
        if (sectionId !== this.selectedSectionId() || date !== this.selectedDate()) return;
        this.marker.set(markers.find(m => m.classSectionId === sectionId) ?? null);
      },
      error: () => undefined,
    });
  }

  // The figures only change with the section or the month, so changing the day within a month reuses them.
  private loadTrend(sectionId: number, date: string) {
    const key = `${sectionId}|${toMonthKey(date)}`;
    if (key === this.trendKey) return;
    this.trendKey = key;
    this.attendanceStats.set(new Map());
    this.trendService.getSectionStats(sectionId, date).subscribe(stats => {
      if (this.trendKey === key) this.attendanceStats.set(stats);
    });
  }

  private loadDefaultRoster(sectionId: number) {
    this.api.getStudentsBySection(sectionId).subscribe({
      next: (studentDtos) => {
        const defaultList: LocalStudentUI[] = studentDtos.map(s => ({
          id: s.id,
          rollNo: s.rollNo,
          name: s.name,
          status: 'PRESENT' // Default status
        }));
        this.students.set(defaultList);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toast.showError(err, 'Failed to load students');
        this.isLoading.set(false);
      }
    });
  }

  setStatus(id: number, status: 'PRESENT' | 'ABSENT') {
    this.attendanceSaved.set(false);
    this.students.update(list =>
      list.map(s => s.id === id ? { ...s, status } : s)
    );
  }

  markAll(status: 'PRESENT' | 'ABSENT') {
    this.attendanceSaved.set(false);
    this.students.update(list => list.map(s => ({ ...s, status })));
  }

  isAttendanceIncomplete = computed(() => {
  const list = this.students();
  if (list.length === 0) return true;
  return list.some(s => !s.status || (s.status !== 'PRESENT' && s.status !== 'ABSENT'));
});

submitAttendance() {
  
  const sectionId = this.selectedSectionId();
  const date = this.selectedDate();

  if (this.students().length === 0) {
    this.toast.show('Cannot submit attendance. No students found in this section.', 'error');
    return;
  }

  // Prevent submit if any student status is unassigned
  if (this.isAttendanceIncomplete()) {
    this.toast.show('Please mark attendance for all students before submitting.', 'error');
    return;
  }

  if (!sectionId || !date) return;

  const payload: MarkAttendanceRequest = {
    classSectionId: sectionId,
    date: date,
    entries: this.students().map(s => ({
      studentId: s.id,
      status: s.status
    }))
  };

  this.isSubmitting.set(true);
  this.api.saveAttendance(payload).subscribe({
    next: () => {
      this.isSubmitting.set(false);
      this.attendanceSaved.set(true);
      this.savedOnServer.set(true);
      this.loadMarker(sectionId, date);
      this.toast.show('Attendance submitted successfully!');
    },
    error: (err) => {
      this.isSubmitting.set(false);
      this.toast.showError(err, 'Failed to save attendance');
    }
  });
}

clearAttendance() {
  const sectionId = this.selectedSectionId();
  const date = this.selectedDate();
  if (!sectionId || !date) return;

  this.isSubmitting.set(true);
  this.api.clearAttendance(sectionId, date).subscribe({
    next: () => {
      this.isSubmitting.set(false);
      this.confirmingClear.set(false);
      this.toast.show('Attendance cleared for this class and day.');
      this.trendKey = '';
      this.fetchAttendanceOrStudents();
    },
    error: (err) => {
      this.isSubmitting.set(false);
      this.confirmingClear.set(false);
      this.toast.showError(err, 'Failed to clear attendance');
    }
  });
}
}
