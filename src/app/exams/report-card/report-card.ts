import { Component, OnDestroy, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ExamService, ReportCardData, ReportCardExam, ReportCardSubject } from '../exam.service';
import { StudentService } from '../../students/student.service';
import { AcademicYearService } from '../../academics/services/academic-year.service';
import { AcademicYear } from '../../academics/models/academic-year.model';
import { ToastService } from '../../shared/services/toast.service';
import { LoaderComponent } from '../../shared/component/loader.component';
import { AttendanceApiService } from '../../attendance/services/attendance-api.service';
import { ClassSection } from '../../attendance/models/attendance.models';
import { ProgressService } from '../../progress/progress.service';
import { attendanceRange } from '../../progress/progress-card.data';
import { AttendanceRegisterService, StudentAttendanceResponse } from '../../reports/services/attendance-register.service';
import { todayIso } from '../../shared/utils/date.util';
import { SchoolConfigService } from '../../school/school-config.service';

interface MatrixRow {
  subjectId: number;
  name: string;
  cells: (ReportCardSubject | null)[];
}

interface ImproveItem {
  subject: string;
  // For example "7/20 in IA-1; absent in Final".
  detail: string;
}

interface CardView {
  mainExams: ReportCardExam[];
  iaExams: ReportCardExam[];
  matrix: MatrixRow[];
  iaSubjects: { subjectId: number; name: string }[];
  iaRows: { exam: ReportCardExam; cells: (ReportCardSubject | null)[] }[];
  gradeScale: { grade: string; minPercentage: number }[];
  improve: ImproveItem[];
}

interface ClassCardItem {
  card: ReportCardData;
  attendance: StudentAttendanceResponse | null;
}

@Component({
  imports: [FormsModule, DatePipe, DecimalPipe, NgTemplateOutlet, LoaderComponent],
  selector: 'app-report-card',
  styleUrl: './report-card.scss',
  templateUrl: './report-card.html',
})
export class ReportCard implements OnInit, OnDestroy {
  private examService = inject(ExamService);
  private studentService = inject(StudentService);
  private yearService = inject(AcademicYearService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private attendanceApi = inject(AttendanceApiService);
  private progressService = inject(ProgressService);
  private register = inject(AttendanceRegisterService);
  protected school = inject(SchoolConfigService);

  // Attendance for the single student shown; null when it can't be read (the card then just leaves it out).
  attendance = signal<StudentAttendanceResponse | null>(null);

  students = signal<any[]>([]);
  studentsLoading = signal<boolean>(true);
  searchQuery = signal<string>('');
  studentId = signal<number | null>(null);

  academicYears = signal<AcademicYear[]>([]);
  yearId = signal<number | null>(null);

  card = signal<ReportCardData | null>(null);
  isLoading = signal<boolean>(false);
  loadFailed = signal<boolean>(false);

  matches = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];
    return this.students()
      .filter(s =>
        (s.name ?? '').toLowerCase().includes(query) ||
        (s.rollNo !== null && s.rollNo !== undefined && String(s.rollNo).toLowerCase().includes(query)))
      .slice(0, 8);
  });

  selectedName = computed(() => {
    const id = this.studentId();
    return this.card()?.name ?? this.students().find(s => s.id === id)?.name ?? '';
  });

  // Everything a card needs on screen, worked out once per card (the page can show many cards at once).
  private derived = new WeakMap<ReportCardData, CardView>();

  derive(card: ReportCardData): CardView {
    let view = this.derived.get(card);
    if (!view) {
      const mainExams = card.exams.filter(e => e.examType !== 'IA');
      const iaExams = card.exams.filter(e => e.examType === 'IA');
      const iaSubjects = this.buildMatrix(iaExams).map(r => ({ subjectId: r.subjectId, name: r.name }));
      view = {
        mainExams,
        iaExams,
        matrix: this.buildMatrix(mainExams),
        iaSubjects,
        iaRows: iaExams.map(exam => ({
          exam,
          cells: iaSubjects.map(s => exam.subjects.find(x => x.subjectId === s.subjectId) ?? null),
        })),
        gradeScale: [...(card.gradeScale ?? [])].sort((a, b) => b.minPercentage - a.minPercentage),
        improve: this.improvementList(card.exams),
      };
      this.derived.set(card, view);
    }
    return view;
  }

  // Subjects where the student was below the pass marks or absent, in any exam, so parents can see where to focus.
  private improvementList(exams: ReportCardExam[]): ImproveItem[] {
    const bySubject = new Map<string, string[]>();
    for (const exam of exams) {
      for (const s of exam.subjects) {
        let note: string | null = null;
        if (s.absent) note = `absent in ${exam.name}`;
        else if (this.isFail(s)) note = `${s.marks}/${s.maxMarks} in ${exam.name}`;
        if (note) bySubject.set(s.subject, [...(bySubject.get(s.subject) ?? []), note]);
      }
    }
    return [...bySubject].map(([subject, notes]) => ({ subject, detail: notes.join('; ') }));
  }

  private buildMatrix(exams: ReportCardExam[]): MatrixRow[] {
    const rows = new Map<number, MatrixRow>();
    exams.forEach((exam, examIndex) => {
      for (const subject of exam.subjects) {
        let row = rows.get(subject.subjectId);
        if (!row) {
          row = { subjectId: subject.subjectId, name: subject.subject, cells: exams.map(() => null) };
          rows.set(subject.subjectId, row);
        }
        row.cells[examIndex] = subject;
      }
    });
    return [...rows.values()];
  }

  // Whole-class mode: one card per student of the chosen class, printed one per page.
  mode = signal<'student' | 'class'>('student');
  sections = signal<ClassSection[]>([]);
  sectionId = signal<number | null>(null);
  classCards = signal<ClassCardItem[]>([]);
  classWithoutMarks = signal<string[]>([]);
  classLoading = signal<boolean>(false);
  classFailed = signal<boolean>(false);
  private classRequest?: Subscription;

  setMode(mode: 'student' | 'class'): void {
    this.mode.set(mode);
  }

  onSectionChange(value: number | null): void {
    this.sectionId.set(value ? Number(value) : null);
    this.loadClass();
  }

  private loadClass(): void {
    this.classRequest?.unsubscribe();
    this.classCards.set([]);
    this.classWithoutMarks.set([]);
    this.classFailed.set(false);
    const sectionId = this.sectionId();
    const yearId = this.yearId() ?? this.academicYears().find(y => y.current)?.id ?? null;
    if (sectionId === null || yearId === null) return;

    this.classLoading.set(true);
    // The term only matters for skills, which this page doesn't print.
    this.classRequest = this.progressService.getClassCards(sectionId, yearId, 1).subscribe({
      next: (res) => {
        const withMarks: ClassCardItem[] = [];
        const without: string[] = [];
        for (const c of res.cards) {
          if (c.academics && c.academics.exams.length > 0) withMarks.push({ card: c.academics, attendance: c.attendance });
          else without.push(c.name);
        }
        this.classCards.set(withMarks);
        this.classWithoutMarks.set(without);
        this.classLoading.set(false);
      },
      error: (err) => {
        this.classLoading.set(false);
        this.classFailed.set(true);
        this.toast.showError(err, 'Failed to load the class report cards');
      },
    });
  }

  ngOnDestroy(): void {
    this.classRequest?.unsubscribe();
  }

  ngOnInit(): void {
    this.attendanceApi.getClassSections().subscribe({
      next: (sections) => this.sections.set(sections),
      error: () => this.sections.set([]),
    });
    this.studentService.getStudents().subscribe({
      next: (data) => {
        this.students.set(data);
        this.studentsLoading.set(false);
      },
      error: (err) => {
        this.studentsLoading.set(false);
        this.toast.showError(err, 'Failed to load students');
      },
    });

    this.yearService.getAll().subscribe({
      next: (years) => {
        this.academicYears.set(years);
        this.yearId.set(years.find(y => y.current)?.id ?? null);
        this.watchRoute();
      },
      error: (err) => {
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
        this.loadCard();
      }
    });
  }

  selectStudent(student: any): void {
    this.searchQuery.set('');
    this.studentId.set(Number(student.id));
    this.loadCard();
  }

  clearStudent(): void {
    this.studentId.set(null);
    this.card.set(null);
    this.loadFailed.set(false);
  }

  onYearChange(value: number | null): void {
    this.yearId.set(value ? Number(value) : null);
    if (this.studentId() !== null) this.loadCard();
    if (this.sectionId() !== null) this.loadClass();
  }

  private loadCard(): void {
    const studentId = this.studentId();
    if (studentId === null) return;

    const yearId = this.yearId();
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.card.set(null);
    this.attendance.set(null);
    this.examService.getReportCard(studentId, yearId).subscribe({
      next: (data) => {
        if (studentId !== this.studentId() || yearId !== this.yearId()) return;
        this.card.set(data);
        this.isLoading.set(false);
        this.loadAttendance(studentId, yearId);
      },
      error: (err) => {
        if (studentId !== this.studentId() || yearId !== this.yearId()) return;
        this.isLoading.set(false);
        this.loadFailed.set(true);
        this.toast.showError(err, 'Failed to load report card');
      },
    });
  }

  // Attendance for the academic year so far. It loads after the card so a slow report never delays the marks.
  private loadAttendance(studentId: number, yearId: number | null): void {
    const year = this.academicYears().find(y => (yearId === null ? y.current : y.id === yearId));
    if (!year) return;
    const { from, to } = attendanceRange(year, todayIso());
    this.register.getStudent(studentId, from, to).subscribe({
      next: (res) => {
        if (studentId === this.studentId() && yearId === this.yearId()) this.attendance.set(res);
      },
      error: () => undefined,
    });
  }

  isPending(exam: ReportCardExam): boolean {
    return exam.result === 'INCOMPLETE';
  }

  isFail(subject: ReportCardSubject | null): boolean {
    return !!subject && !subject.absent && subject.marks !== null && subject.marks < subject.passMarks;
  }

  print(): void {
    window.print();
  }
}
