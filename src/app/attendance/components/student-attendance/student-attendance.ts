import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { AttendanceApiService } from "../../services/attendance-api.service";
import { ClassSection, LocalStudentUI, MarkAttendanceRequest } from "../../models/attendance.models";
import { ToastService } from "../../../shared/services/toast.service";
import { ActivatedRoute } from "@angular/router";

@Component({
  imports: [FormsModule],
  selector: 'app-student-attendance',
  styleUrl: './student-attendance.scss',
  templateUrl: './student-attendance.html',
})
export class StudentAttendance implements OnInit {

  private api = inject(AttendanceApiService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  
  classSections = signal<ClassSection[]>([]);
  selectedSectionId = signal<number | null>(null);
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);

  students = signal<LocalStudentUI[]>([]);
  searchQuery = signal<string>('');
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);


// Derived counts
  presentCount = computed(() => this.students().filter(s => s.status === 'PRESENT').length);
  absentCount = computed(() => this.students().filter(s => s.status === 'ABSENT').length);

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
      error: (err) => this.toast.show('Failed to load sections', err)
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
        this.toast.show('Failed to load students', err);
        this.isLoading.set(false);
      }
    });
  }

  setStatus(id: number, status: 'PRESENT' | 'ABSENT') {
    this.students.update(list =>
      list.map(s => s.id === id ? { ...s, status } : s)
    );
  }

  markAll(status: 'PRESENT' | 'ABSENT') {
    this.students.update(list => list.map(s => ({ ...s, status })));
  }

  submitAttendance() {
    const sectionId = this.selectedSectionId();
    const date = this.selectedDate();

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
        this.toast.show('Attendance submitted successfully!');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.show('Failed to save attendance', err);
      }
    });
  }
}
