import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AcademicYear } from '../../academics/models/academic-year.model';
import { AcademicYearService } from '../../academics/services/academic-year.service';
import { trendFromMonths } from '../../attendance/attendance-trend.util';
import { ExamService, ReportCardData, ReportCardExam } from '../../exams/exam.service';
import { AttendanceRegisterService, StudentAttendanceResponse } from '../../reports/services/attendance-register.service';
import { AttendanceTrendComponent } from '../../shared/component/attendance-trend.component';
import { LoaderComponent } from '../../shared/component/loader.component';
import { ToastService } from '../../shared/services/toast.service';
import { todayIso } from '../../shared/utils/date.util';
import { StudentService } from '../../students/student.service';
import {
  Criterion, RATINGS, RATING_LABELS, StudentAssessment, TERMS, averageRating, groupCriteria, ratingMap,
} from '../progress.models';
import { ProgressService } from '../progress.service';

const DEFAULT_SCHOOL_NAME = 'Sana Misbah School';

@Component({
  selector: 'app-progress-card',
  imports: [FormsModule, DatePipe, DecimalPipe, RouterLink, LoaderComponent, AttendanceTrendComponent],
  templateUrl: './progress-card.html',
  styleUrl: './progress-card.scss',
})
export class ProgressCard implements OnInit {
  private examService = inject(ExamService);
  private studentService = inject(StudentService);
  private yearService = inject(AcademicYearService);
  private register = inject(AttendanceRegisterService);
  private progress = inject(ProgressService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  readonly terms = TERMS;
  readonly scale = [...RATINGS].reverse();
  readonly ratingLabels = RATING_LABELS;
  readonly schoolFallback = DEFAULT_SCHOOL_NAME;

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

  mainExams = computed<ReportCardExam[]>(() => (this.academics()?.exams ?? []).filter(e => e.examType !== 'IA'));

  assessment = computed(() => this.assessments().find(a => a.term === this.term()) ?? null);

  skillGroups = computed(() => {
    const ratings = ratingMap(this.assessment());
    return groupCriteria(this.criteria()).map(group => ({
      label: group.label,
      average: averageRating(group.criteria, ratings),
      items: group.criteria.map(c => ({ name: c.name, rating: ratings.get(c.id) ?? null })),
    }));
  });

  attendanceTrend = computed(() => trendFromMonths(this.attendance()?.months ?? []).trend);

  studentName = computed(() => this.academics()?.name ?? this.attendance()?.name ?? this.selectedStudent()?.name ?? '');
  className = computed(() => this.academics()?.className ?? this.attendance()?.className ?? '');
  rollNo = computed(() => this.academics()?.rollNo ?? this.attendance()?.rollNo ?? this.selectedStudent()?.rollNo ?? '-');

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

    const today = todayIso();
    const to = year.endDate && year.endDate < today ? year.endDate : today;

    // Each part loads independently so one failing service does not blank the whole card.
    forkJoin({
      academics: this.examService.getReportCard(studentId, yearId).pipe(
        catchError(() => { this.academicsFailed.set(true); return of(null); })),
      attendance: this.register.getStudent(studentId, year.startDate, to < year.startDate ? year.startDate : to).pipe(
        catchError(() => { this.attendanceFailed.set(true); return of(null); })),
      assessments: this.progress.getStudentAssessments(studentId, yearId).pipe(
        catchError(() => { this.assessmentsFailed.set(true); return of([] as StudentAssessment[]); })),
    }).subscribe(result => {
      if (studentId !== this.studentId() || yearId !== this.yearId()) return;
      this.academics.set(result.academics);
      this.attendance.set(result.attendance);
      this.assessments.set(result.assessments);
      this.isLoading.set(false);
      this.hasLoaded.set(true);
    });
  }

  isPending(exam: ReportCardExam): boolean {
    return exam.result === 'INCOMPLETE';
  }

  dots(rating: number | null): boolean[] {
    return RATINGS.map(r => rating !== null && r <= rating);
  }

  print(): void {
    window.print();
  }
}
