import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Exam, ExamClassSection, ExamResultSheet, ExamService, ResultScore, ResultStudent } from '../exam.service';
import { AcademicYearService } from '../../academics/services/academic-year.service';
import { AcademicYear } from '../../academics/models/academic-year.model';
import { ToastService } from '../../shared/services/toast.service';
import { LoaderComponent } from '../../shared/component/loader.component';
import { downloadCsv, toCsv } from '../../shared/utils/csv.util';
import { ExamResultsCharts } from './exam-results-charts';

type SortMode = 'roll' | 'rank';

@Component({
  imports: [FormsModule, DecimalPipe, LoaderComponent, ExamResultsCharts],
  selector: 'app-exam-results',
  styleUrl: './exam-results.scss',
  templateUrl: './exam-results.html',
})
export class ExamResults implements OnInit {
  private examService = inject(ExamService);
  private yearService = inject(AcademicYearService);
  private toast = inject(ToastService);

  academicYears = signal<AcademicYear[]>([]);
  yearId = signal<number | null>(null);
  exams = signal<Exam[]>([]);
  sections = signal<ExamClassSection[]>([]);
  examId = signal<number | null>(null);
  sectionId = signal<number | null>(null);

  sheet = signal<ExamResultSheet | null>(null);
  isLoadingMeta = signal<boolean>(true);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  sortMode = signal<SortMode>('roll');

  students = computed(() => {
    const list = [...(this.sheet()?.students ?? [])];
    if (this.sortMode() === 'rank') {
      return list.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || this.compareRoll(a, b));
    }
    return list.sort((a, b) => this.compareRoll(a, b));
  });

  summary = computed(() => {
    const list = this.sheet()?.students ?? [];
    const complete = list.filter(s => s.result !== 'INCOMPLETE');
    return {
      total: list.length,
      passed: list.filter(s => s.result === 'PASS').length,
      failed: list.filter(s => s.result === 'FAIL').length,
      incomplete: list.filter(s => s.result === 'INCOMPLETE').length,
      average: complete.length > 0 ? complete.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / complete.length : null,
    };
  });

  ngOnInit(): void {
    this.examService.getClassSections().subscribe({
      next: (data) => this.sections.set(data),
      error: (err) => this.toast.showError(err, 'Failed to load class sections'),
    });
    this.yearService.getAll().subscribe({
      next: (years) => {
        this.academicYears.set(years);
        this.yearId.set(years.find(y => y.current)?.id ?? null);
        this.loadExams();
      },
      error: (err) => {
        this.toast.showError(err, 'Failed to load academic years');
        this.loadExams();
      },
    });
  }

  private compareRoll(a: ResultStudent, b: ResultStudent): number {
    const left = a.rollNo === null || a.rollNo === undefined ? '' : String(a.rollNo);
    const right = b.rollNo === null || b.rollNo === undefined ? '' : String(b.rollNo);
    return left.localeCompare(right, undefined, { numeric: true }) || a.name.localeCompare(b.name);
  }

  private loadExams(): void {
    this.isLoadingMeta.set(true);
    this.examService.getExams(this.yearId()).subscribe({
      next: (data) => {
        this.exams.set(data);
        this.isLoadingMeta.set(false);
      },
      error: (err) => {
        this.isLoadingMeta.set(false);
        this.toast.showError(err, 'Failed to load exams');
      },
    });
  }

  onYearChange(value: number | null): void {
    this.yearId.set(value ? Number(value) : null);
    this.examId.set(null);
    this.exams.set([]);
    this.sheet.set(null);
    this.errorMessage.set(null);
    this.loadExams();
  }

  onExamChange(value: number | null): void {
    this.examId.set(value ? Number(value) : null);
    this.loadResults();
  }

  onSectionChange(value: number | null): void {
    this.sectionId.set(value ? Number(value) : null);
    this.loadResults();
  }

  private loadResults(): void {
    this.sheet.set(null);
    this.errorMessage.set(null);
    const examId = this.examId();
    const sectionId = this.sectionId();
    if (examId === null || sectionId === null) return;

    this.isLoading.set(true);
    this.examService.getResults(examId, sectionId).subscribe({
      next: (data) => {
        if (examId !== this.examId() || sectionId !== this.sectionId()) return;
        this.sheet.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        if (examId !== this.examId() || sectionId !== this.sectionId()) return;
        this.isLoading.set(false);
        const body = err?.error;
        this.errorMessage.set((typeof body === 'string' ? body : body?.message) || 'Failed to load results');
        this.toast.showError(err, 'Failed to load results');
      },
    });
  }

  scoreAt(student: ResultStudent, index: number, subjectId: number): ResultScore | null {
    const aligned = student.scores[index];
    if (aligned && aligned.subjectId === subjectId) return aligned;
    return student.scores.find(s => s.subjectId === subjectId) ?? null;
  }

  isFail(score: ResultScore | null, passMarks: number): boolean {
    return !!score && !score.absent && score.marks !== null && score.marks < passMarks;
  }

  pendingTitle(score: ResultScore | null, iaMax: number): string {
    return iaMax > 0 && (!score || score.iaMarks === null) ? 'IA marks pending' : 'Marks pending';
  }

  resultClass(result: string): string {
    return result === 'PASS' ? 'badge-success' : result === 'FAIL' ? 'badge-danger' : '';
  }

  exportCsv(): void {
    const data = this.sheet();
    if (!data) return;

    const header = [
      'Rank', 'Roll No', 'Name',
      ...data.subjects.flatMap(s => s.iaMax > 0
        ? [`${s.name} (${s.maxMarks})`, `${s.name} IA`, `${s.name} Written`]
        : [`${s.name} (${s.maxMarks})`]),
      'Total', 'Max Total', 'Percentage', 'Grade', 'Result',
    ];
    const body = this.students().map(st => [
      st.rank,
      st.rollNo,
      st.name,
      ...data.subjects.flatMap((sub, i) => {
        const score = this.scoreAt(st, i, sub.subjectId);
        const combined = !score ? '' : score.absent ? 'AB' : score.marks;
        if (sub.iaMax <= 0) return [combined];
        return [combined, score?.iaMarks ?? '', score ? (score.absent ? 'AB' : score.writtenMarks ?? '') : ''];
      }),
      st.totalMarks,
      st.totalMax,
      st.percentage === null || st.percentage === undefined ? '' : Math.round(st.percentage * 100) / 100,
      st.grade,
      st.result,
    ]);
    const name = `results-${data.examName}-${data.className}`.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    downloadCsv(`${name}.csv`, toCsv([header, ...body]));
  }

  print(): void {
    window.print();
  }
}
