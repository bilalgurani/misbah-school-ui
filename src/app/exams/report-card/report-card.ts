import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ExamService, ReportCardData, ReportCardExam, ReportCardSubject } from '../exam.service';
import { StudentService } from '../../students/student.service';
import { AcademicYearService } from '../../academics/services/academic-year.service';
import { AcademicYear } from '../../academics/models/academic-year.model';
import { ToastService } from '../../shared/services/toast.service';
import { LoaderComponent } from '../../shared/component/loader.component';

interface MatrixRow {
  subjectId: number;
  name: string;
  cells: (ReportCardSubject | null)[];
}

@Component({
  imports: [FormsModule, DatePipe, DecimalPipe, LoaderComponent],
  selector: 'app-report-card',
  styleUrl: './report-card.scss',
  templateUrl: './report-card.html',
})
export class ReportCard implements OnInit {
  private examService = inject(ExamService);
  private studentService = inject(StudentService);
  private yearService = inject(AcademicYearService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

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

  mainExams = computed(() => (this.card()?.exams ?? []).filter(e => e.examType !== 'IA'));
  iaExams = computed(() => (this.card()?.exams ?? []).filter(e => e.examType === 'IA'));

  matrix = computed<MatrixRow[]>(() => this.buildMatrix(this.mainExams()));

  iaSubjects = computed(() => this.buildMatrix(this.iaExams()).map(r => ({ subjectId: r.subjectId, name: r.name })));

  iaRows = computed(() => {
    const exams = this.iaExams();
    const subjects = this.iaSubjects();
    return exams.map(exam => ({
      exam,
      cells: subjects.map(s => exam.subjects.find(x => x.subjectId === s.subjectId) ?? null),
    }));
  });

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

  gradeScale = computed(() => [...(this.card()?.gradeScale ?? [])].sort((a, b) => b.minPercentage - a.minPercentage));

  ngOnInit(): void {
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
  }

  private loadCard(): void {
    const studentId = this.studentId();
    if (studentId === null) return;

    const yearId = this.yearId();
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.card.set(null);
    this.examService.getReportCard(studentId, yearId).subscribe({
      next: (data) => {
        if (studentId !== this.studentId() || yearId !== this.yearId()) return;
        this.card.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        if (studentId !== this.studentId() || yearId !== this.yearId()) return;
        this.isLoading.set(false);
        this.loadFailed.set(true);
        this.toast.showError(err, 'Failed to load report card');
      },
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
