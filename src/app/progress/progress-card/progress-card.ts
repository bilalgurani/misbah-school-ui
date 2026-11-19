import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AcademicYear } from '../../academics/models/academic-year.model';
import { AcademicYearService } from '../../academics/services/academic-year.service';
import { EnrollmentService } from '../../academics/services/enrollment.service';
import { StudentEnrollment } from '../../academics/models/enrollment.model';
import { ExamService, ReportCardData } from '../../exams/exam.service';
import { AttendanceRegisterService, StudentAttendanceResponse } from '../../reports/services/attendance-register.service';
import { LoaderComponent } from '../../shared/component/loader.component';
import { ToastService } from '../../shared/services/toast.service';
import { todayIso } from '../../shared/utils/date.util';
import { StudentService } from '../../students/student.service';
import { ProgressCardData, attendanceRange } from '../progress-card.data';
import { ProgressCardSheet } from '../progress-card-sheet/progress-card-sheet';
import { Criterion, StudentAssessment, TERMS } from '../progress.models';
import { ProgressService } from '../progress.service';

@Component({
  selector: 'app-progress-card',
  imports: [FormsModule, RouterLink, LoaderComponent, ProgressCardSheet],
  templateUrl: './progress-card.html',
  styleUrl: './progress-card.scss',
})
export class ProgressCard implements OnInit {
  private examService = inject(ExamService);
  private studentService = inject(StudentService);
  private yearService = inject(AcademicYearService);
  private register = inject(AttendanceRegisterService);
  private progress = inject(ProgressService);
  private enrollmentService = inject(EnrollmentService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  readonly terms = TERMS;

  students = signal<any[]>([]);
  studentsLoading = signal(true);
  searchQuery = signal('');
  studentId = signal<number | null>(null);

  years = signal<AcademicYear[]>([]);
  yearId = signal<number | null>(null);
  term = signal<number>(1);

  criteria = signal<Criterion[]>([]);
  academics = signal<ReportCardData | null>(null);
  attendance = signal<StudentAttendanceResponse | null>(null);
  assessments = signal<StudentAssessment[]>([]);
  // The class the student was in during the chosen year. The exam report only knows their current class.
  yearClassName = signal<string | null>(null);

  isLoading = signal(false);
  hasLoaded = signal(false);
  academicsFailed = signal(false);
  attendanceFailed = signal(false);
  assessmentsFailed = signal(false);

  matches = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];
    return this.students()
      .filter(s =>
        (s.name ?? '').toLowerCase().includes(query) ||
        (s.rollNo !== null && s.rollNo !== undefined && String(s.rollNo).toLowerCase().includes(query)))
      .slice(0, 8);
  });

  selectedStudent = computed(() => this.students().find(s => s.id === this.studentId()) ?? null);
  selectedYear = computed(() => this.years().find(y => y.id === this.yearId()) ?? null);

  assessment = computed(() => this.assessments().find(a => a.term === this.term()) ?? null);

  cardData = computed<ProgressCardData>(() => {
    const academics = this.academics();
    const attendance = this.attendance();
    const student = this.selectedStudent();
    return {
      studentId: this.studentId() ?? 0,
      name: academics?.name ?? attendance?.name ?? student?.name ?? '',
      rollNo: academics?.rollNo ?? attendance?.rollNo ?? student?.rollNo ?? null,
      className: this.yearClassName() ?? academics?.className ?? attendance?.className ?? '',
      fatherName: academics?.fatherName ?? null,
      schoolName: academics?.schoolName ?? null,
      yearName: this.selectedYear()?.name ?? '',
      term: this.term(),
      academics,
      attendance,
      assessment: this.assessment(),
      academicsFailed: this.academicsFailed(),
      attendanceFailed: this.attendanceFailed(),
    };
  });

  ngOnInit(): void {
    this.studentService.getStudents().subscribe({
      next: data => {
        this.students.set(data);
        this.studentsLoading.set(false);
      },
      error: err => {
        this.studentsLoading.set(false);
        this.toast.showError(err, 'Failed to load students');
      },
    });

    this.progress.getCriteria().pipe(catchError(() => of([] as Criterion[]))).subscribe(c => this.criteria.set(c));

    this.yearService.getAll().subscribe({
      next: years => {
        this.years.set(years);
        this.yearId.set(years.find(y => y.current)?.id ?? years[0]?.id ?? null);
        this.watchRoute();
      },
      error: err => {
        this.toast.showError(err, 'Failed to load academic years');
        this.watchRoute();
      },
    });
  }

  private watchRoute(): void {
    this.route.queryParamMap.subscribe(params => {
      const id = Number(params.get('studentId'));
      if (id > 0 && this.studentId() !== id) {
        this.studentId.set(id);
        this.load();
      }
    });
  }

  selectStudent(student: any): void {
    this.searchQuery.set('');
    this.studentId.set(Number(student.id));
    this.load();
  }

  clearStudent(): void {
    this.studentId.set(null);
    this.hasLoaded.set(false);
  }

  onYearChange(value: number | null): void {
    this.yearId.set(value ? Number(value) : null);
    if (this.studentId() !== null) this.load();
  }

  onTermChange(value: number): void {
    this.term.set(Number(value));
  }

  private load(): void {
    const studentId = this.studentId();
    const yearId = this.yearId();
    const year = this.selectedYear();
    if (studentId === null || yearId === null || !year) return;

    this.isLoading.set(true);
    this.hasLoaded.set(false);
    this.academicsFailed.set(false);
    this.attendanceFailed.set(false);
    this.assessmentsFailed.set(false);

    const { from, to } = attendanceRange(year, todayIso());

    // Each part loads independently so one failing service does not blank the whole card.
    forkJoin({
      academics: this.examService.getReportCard(studentId, yearId).pipe(
        catchError(() => { this.academicsFailed.set(true); return of(null); })),
      attendance: this.register.getStudent(studentId, from, to).pipe(
        catchError(() => { this.attendanceFailed.set(true); return of(null); })),
      assessments: this.progress.getStudentAssessments(studentId, yearId).pipe(
        catchError(() => { this.assessmentsFailed.set(true); return of([] as StudentAssessment[]); })),
      history: this.enrollmentService.getHistory(studentId).pipe(catchError(() => of([] as StudentEnrollment[]))),
    }).subscribe(result => {
      if (studentId !== this.studentId() || yearId !== this.yearId()) return;
      const enrollment = result.history.find(e => e.academicYearId === yearId);
      this.yearClassName.set(enrollment?.className && enrollment.sectionName
        ? `${enrollment.className} - ${enrollment.sectionName}` : null);
      this.academics.set(result.academics);
      this.attendance.set(result.attendance);
      this.assessments.set(result.assessments);
      this.isLoading.set(false);
      this.hasLoaded.set(true);
    });
  }

  print(): void {
    window.print();
  }
}
