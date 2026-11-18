import { Component, computed, ElementRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Exam, ExamClassSection, ExamService, ExamSubject, MarksSheet } from '../exam.service';
import { AcademicYearService } from '../../academics/services/academic-year.service';
import { AcademicYear } from '../../academics/models/academic-year.model';
import { ToastService } from '../../shared/services/toast.service';
import { LoaderComponent } from '../../shared/component/loader.component';
import { ConfirmDialogComponent } from '../../shared/component/confirm-dialog.component';

interface EntryRow {
  studentId: number;
  rollNo: number | string | null;
  name: string;
  marks: number | null;
  absent: boolean;
  savedMarks: number | null;
  savedAbsent: boolean;
}

interface SubjectOption {
  subjectId: number;
  name: string;
  iaMaxMarks: number;
}

@Component({
  imports: [FormsModule, LoaderComponent, ConfirmDialogComponent],
  selector: 'app-marks-entry',
  styleUrl: './marks-entry.scss',
  templateUrl: './marks-entry.html',
})
export class MarksEntry implements OnInit {
  private examService = inject(ExamService);
  private yearService = inject(AcademicYearService);
  private toast = inject(ToastService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  academicYears = signal<AcademicYear[]>([]);
  yearId = signal<number | null>(null);
  exams = signal<Exam[]>([]);
  sections = signal<ExamClassSection[]>([]);
  subjectOptions = signal<SubjectOption[]>([]);

  examId = signal<number | null>(null);
  sectionId = signal<number | null>(null);
  subjectId = signal<number | null>(null);

  sheet = signal<MarksSheet | null>(null);
  rows = signal<EntryRow[]>([]);

  isLoadingMeta = signal<boolean>(true);
  isLoadingSubjects = signal<boolean>(false);
  isLoadingSheet = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  submitted = signal<boolean>(false);
  sheetError = signal<string | null>(null);
  confirmDiscard = signal<boolean>(false);

  total = computed(() => this.rows().length);
  iaExams = computed(() => this.exams().filter(e => e.examType === 'IA'));
  mainExams = computed(() => this.exams().filter(e => e.examType !== 'IA'));
  selectedExam = computed(() => this.exams().find(e => e.id === this.examId()) ?? null);
  iaNote = computed(() => {
    const exam = this.selectedExam();
    const option = this.subjectOptions().find(o => o.subjectId === this.subjectId());
    if (!exam || exam.examType === 'IA' || !option || option.iaMaxMarks <= 0) return null;
    const names = this.exams()
      .filter(e => e.examType === 'IA' && (exam.iaExamIds ?? []).includes(e.id))
      .map(e => e.name);
    return {
      weight: option.iaMaxMarks,
      names: names.length > 0 ? names.join(', ') : null,
    };
  });
  entered = computed(() => this.rows().filter(r => r.absent || r.marks !== null).length);
  dirty = computed(() => this.rows().some(r => r.marks !== r.savedMarks || r.absent !== r.savedAbsent));
  invalidCount = computed(() => this.rows().filter(r => this.rowError(r) !== null).length);
  locked = computed(() => this.dirty() || this.isSaving());

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

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty()) event.preventDefault();
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

  private errorMessage(err: any, fallback: string): string {
    const body = err?.error;
    return (typeof body === 'string' ? body : body?.message) || fallback;
  }

  private clearSheet(): void {
    this.sheet.set(null);
    this.rows.set([]);
    this.sheetError.set(null);
    this.submitted.set(false);
  }

  onYearChange(value: number | null): void {
    this.yearId.set(value ? Number(value) : null);
    this.examId.set(null);
    this.subjectOptions.set([]);
    this.subjectId.set(null);
    this.exams.set([]);
    this.clearSheet();
    this.loadExams();
  }

  onExamChange(value: number | null): void {
    this.examId.set(value ? Number(value) : null);
    this.loadSubjects();
  }

  onSectionChange(value: number | null): void {
    this.sectionId.set(value ? Number(value) : null);
    this.loadSubjects();
  }

  onSubjectChange(value: number | null): void {
    this.subjectId.set(value ? Number(value) : null);
    this.loadSheet();
  }

  private loadSubjects(): void {
    this.subjectOptions.set([]);
    this.subjectId.set(null);
    this.clearSheet();

    const examId = this.examId();
    const section = this.sections().find(s => s.id === this.sectionId());
    if (examId === null || !section) return;

    this.isLoadingSubjects.set(true);
    this.examService.getExamSubjects(examId, section.classLevelId ?? null).subscribe({
      next: (data: ExamSubject[]) => {
        if (examId !== this.examId() || section.id !== this.sectionId()) return;
        const seen = new Set<number>();
        const options: SubjectOption[] = [];
        for (const item of data) {
          if (seen.has(item.subjectId)) continue;
          seen.add(item.subjectId);
          options.push({ subjectId: item.subjectId, name: item.subjectName, iaMaxMarks: item.iaMaxMarks ?? 0 });
        }
        this.subjectOptions.set(options);
        this.isLoadingSubjects.set(false);
        if (options.length === 1) this.onSubjectChange(options[0].subjectId);
      },
      error: (err) => {
        this.isLoadingSubjects.set(false);
        this.toast.showError(err, 'Failed to load exam subjects');
      },
    });
  }

  private loadSheet(): void {
    this.clearSheet();
    const examId = this.examId();
    const sectionId = this.sectionId();
    const subjectId = this.subjectId();
    if (examId === null || sectionId === null || subjectId === null) return;

    this.isLoadingSheet.set(true);
    this.examService.getMarks(examId, sectionId, subjectId).subscribe({
      next: (data) => {
        if (examId !== this.examId() || sectionId !== this.sectionId() || subjectId !== this.subjectId()) return;
        this.sheet.set(data);
        this.rows.set(data.students.map(s => ({
          studentId: s.studentId,
          rollNo: s.rollNo,
          name: s.name,
          marks: s.absent ? null : s.marks,
          absent: s.absent,
          savedMarks: s.absent ? null : s.marks,
          savedAbsent: s.absent,
        })));
        this.isLoadingSheet.set(false);
      },
      error: (err) => {
        this.isLoadingSheet.set(false);
        this.sheetError.set(this.errorMessage(err, 'Failed to load marks'));
        this.toast.showError(err, 'Failed to load marks');
      },
    });
  }

  requestDiscard(): void {
    this.confirmDiscard.set(true);
  }

  cancelDiscard(): void {
    this.confirmDiscard.set(false);
  }

  discard(): void {
    this.confirmDiscard.set(false);
    this.submitted.set(false);
    this.rows.update(list => list.map(r => ({ ...r, marks: r.savedMarks, absent: r.savedAbsent })));
  }

  onMarksChange(studentId: number, value: number | string | null): void {
    const parsed = value === null || value === '' ? null : Number(value);
    const marks = parsed === null || Number.isNaN(parsed) ? null : parsed;
    this.rows.update(list => list.map(r => r.studentId === studentId ? { ...r, marks } : r));
  }

  onAbsentChange(studentId: number, absent: boolean): void {
    this.rows.update(list => list.map(r => r.studentId === studentId ? { ...r, absent } : r));
  }

  rowError(row: EntryRow): string | null {
    const sheet = this.sheet();
    if (!sheet || row.absent || row.marks === null) return null;
    if (row.marks < 0) return 'Marks cannot be negative.';
    if (row.marks > sheet.maxMarks) return `Cannot exceed ${sheet.maxMarks}.`;
    return null;
  }

  isBelowPass(row: EntryRow): boolean {
    const sheet = this.sheet();
    return !!sheet && !row.absent && row.marks !== null && row.marks < sheet.passMarks;
  }

  focusNext(event: Event): void {
    event.preventDefault();
    const inputs = Array.from(this.host.nativeElement.querySelectorAll<HTMLInputElement>('input.mark-input:not(:disabled)'));
    const index = inputs.indexOf(event.target as HTMLInputElement);
    const next = inputs[index + 1];
    if (next) {
      next.focus();
      next.select();
    } else {
      this.host.nativeElement.querySelector<HTMLButtonElement>('#save-marks')?.focus();
    }
  }

  save(): void {
    const sheet = this.sheet();
    const examId = this.examId();
    if (!sheet || examId === null) return;

    this.submitted.set(true);
    if (this.invalidCount() > 0) {
      this.toast.show('Fix the highlighted marks before saving.', 'error');
      return;
    }

    const rows = this.rows();
    this.isSaving.set(true);
    this.examService.saveMarks(examId, {
      classSectionId: sheet.classSectionId,
      subjectId: sheet.subjectId,
      entries: rows.map(r => ({
        studentId: r.studentId,
        marks: r.absent ? null : r.marks,
        absent: r.absent,
      })),
    }).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.submitted.set(false);
        this.rows.update(list => list.map(r => ({
          ...r,
          marks: r.absent ? null : r.marks,
          savedMarks: r.absent ? null : r.marks,
          savedAbsent: r.absent,
        })));
        this.toast.show(`Saved marks for ${res?.saved ?? rows.length} student(s).`);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Failed to save marks');
      },
    });
  }
}
