import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ClassLevel, Exam, ExamService, ExamType, IaAggregation, Subject } from '../exam.service';
import { AcademicYearService } from '../../academics/services/academic-year.service';
import { AcademicYear } from '../../academics/models/academic-year.model';
import { ToastService } from '../../shared/services/toast.service';
import { LoaderComponent } from '../../shared/component/loader.component';
import { ConfirmDialogComponent } from '../../shared/component/confirm-dialog.component';

interface PaperRow {
  uid: number;
  subjectId: number | null;
  maxMarks: number | null;
  passMarks: number | null;
  iaMaxMarks: number | null;
}

interface CopyOutcome {
  levelName: string;
  error: string | null;
}

type DeleteTarget = { kind: 'subject'; item: Subject } | { kind: 'exam'; item: Exam };

@Component({
  imports: [ReactiveFormsModule, FormsModule, DatePipe, LoaderComponent, ConfirmDialogComponent],
  selector: 'app-exam-setup',
  styleUrl: './exam-setup.scss',
  templateUrl: './exam-setup.html',
})
export class ExamSetup implements OnInit {
  private fb = inject(FormBuilder);
  private examService = inject(ExamService);
  private yearService = inject(AcademicYearService);
  private toast = inject(ToastService);
  private nextUid = 1;

  subjects = signal<Subject[]>([]);
  subjectsLoading = signal<boolean>(true);
  newSubjectName = signal<string>('');
  isAddingSubject = signal<boolean>(false);

  academicYears = signal<AcademicYear[]>([]);
  classLevels = signal<ClassLevel[]>([]);
  yearId = signal<number | null>(null);
  exams = signal<Exam[]>([]);
  examsLoading = signal<boolean>(true);
  isCreatingExam = signal<boolean>(false);
  examSubmitted = signal<boolean>(false);

  deleteTarget = signal<DeleteTarget | null>(null);
  isDeleting = signal<boolean>(false);

  paperExamId = signal<number | null>(null);
  paperLevelId = signal<number | null>(null);
  rows = signal<PaperRow[]>([]);
  paperLoading = signal<boolean>(false);
  isSavingPaper = signal<boolean>(false);
  paperDirty = signal<boolean>(false);
  paperSubmitted = signal<boolean>(false);

  copyOpen = signal<boolean>(false);
  copyLevelIds = signal<number[]>([]);
  isCopying = signal<boolean>(false);
  copyOutcomes = signal<CopyOutcome[]>([]);

  iaPanelExamId = signal<number | null>(null);
  iaSelectedIds = signal<number[]>([]);
  iaAggregation = signal<IaAggregation>('AVERAGE');
  isSavingLinks = signal<boolean>(false);

  importOpen = signal<boolean>(false);
  importExamId = signal<number | null>(null);
  importLevelId = signal<number | null>(null);
  isImporting = signal<boolean>(false);

  examForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    examType: ['MAIN' as ExamType],
    startDate: [''],
    endDate: [''],
  });

  iaExams = computed(() => this.exams().filter(e => e.examType === 'IA'));
  iaPanelExam = computed(() => this.exams().find(e => e.id === this.iaPanelExamId() && e.examType !== 'IA') ?? null);
  paperExam = computed(() => this.exams().find(e => e.id === this.paperExamId()) ?? null);
  paperIsMain = computed(() => {
    const exam = this.paperExam();
    return !!exam && exam.examType !== 'IA';
  });

  otherLevels = computed(() => this.classLevels().filter(l => l.id !== this.paperLevelId()));

  rowErrors = computed(() => {
    const rows = this.rows();
    const withIa = this.paperIsMain();
    const errors = new Map<number, string>();
    for (const row of rows) {
      const max = row.maxMarks;
      const pass = row.passMarks;
      const ia = withIa ? row.iaMaxMarks ?? 0 : 0;
      if (row.subjectId === null) errors.set(row.uid, 'Select a subject.');
      else if (rows.some(r => r.uid !== row.uid && r.subjectId === row.subjectId)) errors.set(row.uid, 'Subject is repeated.');
      else if (max === null || !(max > 0)) errors.set(row.uid, 'Max marks must be greater than 0.');
      else if (ia < 0) errors.set(row.uid, 'IA weight cannot be negative.');
      else if (pass === null || pass < 0 || pass > max + ia) {
        errors.set(row.uid, withIa && ia > 0
          ? 'Pass marks must be between 0 and max + IA weight.'
          : 'Pass marks must be between 0 and max marks.');
      }
    }
    return errors;
  });

  paperValid = computed(() => this.rows().length > 0 && this.rowErrors().size === 0);

  ngOnInit(): void {
    this.loadSubjects();
    this.examService.getClassLevels().subscribe({
      next: (levels) => this.classLevels.set(levels),
      error: (err) => this.toast.showError(err, 'Failed to load class levels'),
    });
    this.yearService.getAll().subscribe({
      next: (years) => {
        this.academicYears.set(years);
        const current = years.find(y => y.current) ?? null;
        this.yearId.set(current?.id ?? null);
        this.loadExams();
      },
      error: (err) => {
        this.toast.showError(err, 'Failed to load academic years');
        this.loadExams();
      },
    });
  }

  loadSubjects(): void {
    this.subjectsLoading.set(true);
    this.examService.getSubjects().subscribe({
      next: (data) => {
        this.subjects.set(data);
        this.subjectsLoading.set(false);
      },
      error: (err) => {
        this.subjectsLoading.set(false);
        this.toast.showError(err, 'Failed to load subjects');
      },
    });
  }

  addSubject(): void {
    const name = this.newSubjectName().trim();
    if (!name) return;
    if (this.subjects().some(s => s.name.toLowerCase() === name.toLowerCase())) {
      this.toast.show('This subject already exists.', 'error');
      return;
    }
    this.isAddingSubject.set(true);
    this.examService.createSubject(name).subscribe({
      next: () => {
        this.isAddingSubject.set(false);
        this.newSubjectName.set('');
        this.toast.show('Subject added.');
        this.loadSubjects();
      },
      error: (err) => {
        this.isAddingSubject.set(false);
        this.toast.showError(err, 'Failed to add subject');
      },
    });
  }

  loadExams(): void {
    this.examsLoading.set(true);
    this.examService.getExams(this.yearId()).subscribe({
      next: (data) => {
        this.exams.set(data);
        this.examsLoading.set(false);
        this.syncIaPanel();
        if (this.importExamId() !== null && !data.some(e => e.id === this.importExamId())) this.importExamId.set(null);
        if (this.paperExamId() !== null && !data.some(e => e.id === this.paperExamId())) {
          this.paperExamId.set(null);
          this.resetPaper();
        }
      },
      error: (err) => {
        this.examsLoading.set(false);
        this.toast.showError(err, 'Failed to load exams');
      },
    });
  }

  onYearChange(value: number | null): void {
    this.yearId.set(value ? Number(value) : null);
    this.loadExams();
  }

  createExam(): void {
    this.examSubmitted.set(true);
    const value = this.examForm.getRawValue();
    if (this.examForm.invalid) return;
    if (value.startDate && value.endDate && value.endDate < value.startDate) return;

    this.isCreatingExam.set(true);
    this.examService.createExam({
      academicYearId: this.yearId(),
      name: value.name.trim(),
      startDate: value.startDate || null,
      endDate: value.endDate || null,
      examType: value.examType,
    }).subscribe({
      next: () => {
        this.isCreatingExam.set(false);
        this.examSubmitted.set(false);
        this.examForm.reset({ name: '', examType: value.examType, startDate: '', endDate: '' });
        this.toast.show(value.examType === 'IA' ? 'IA test created.' : 'Exam created.');
        this.loadExams();
      },
      error: (err) => {
        this.isCreatingExam.set(false);
        this.toast.showError(err, 'Failed to create exam');
      },
    });
  }

  dateRangeInvalid(): boolean {
    const { startDate, endDate } = this.examForm.getRawValue();
    return !!startDate && !!endDate && endDate < startDate;
  }

  requestDeleteSubject(item: Subject): void {
    this.deleteTarget.set({ kind: 'subject', item });
  }

  requestDeleteExam(item: Exam): void {
    this.deleteTarget.set({ kind: 'exam', item });
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
    this.isDeleting.set(false);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.isDeleting.set(true);

    if (target.kind === 'subject') {
      this.examService.deleteSubject(target.item.id).subscribe({
        next: () => {
          this.subjects.update(list => list.filter(s => s.id !== target.item.id));
          this.rows.update(list => list.map(r => r.subjectId === target.item.id ? { ...r, subjectId: null } : r));
          this.toast.show('Subject deleted.');
          this.cancelDelete();
        },
        error: (err) => {
          this.isDeleting.set(false);
          this.toast.showError(err, 'Failed to delete subject');
        },
      });
    } else {
      this.examService.deleteExam(target.item.id).subscribe({
        next: () => {
          this.exams.update(list => list.filter(e => e.id !== target.item.id));
          this.syncIaPanel();
          if (this.paperExamId() === target.item.id) {
            this.paperExamId.set(null);
            this.resetPaper();
          }
          this.toast.show('Exam deleted.');
          this.cancelDelete();
        },
        error: (err) => {
          this.isDeleting.set(false);
          this.toast.showError(err, 'Failed to delete exam');
        },
      });
    }
  }

  deleteMessage(target: DeleteTarget): string {
    return target.kind === 'subject'
      ? `Delete subject ${target.item.name}? This cannot be undone.`
      : `Delete exam ${target.item.name}? This cannot be undone.`;
  }

  onPaperExamChange(value: number | null): void {
    this.paperExamId.set(value ? Number(value) : null);
    this.loadPaper();
  }

  onPaperLevelChange(value: number | null): void {
    this.paperLevelId.set(value ? Number(value) : null);
    this.loadPaper();
  }

  private resetPaper(): void {
    this.rows.set([]);
    this.paperDirty.set(false);
    this.paperSubmitted.set(false);
    this.copyOpen.set(false);
    this.copyLevelIds.set([]);
    this.copyOutcomes.set([]);
    this.importOpen.set(false);
  }

  private loadPaper(): void {
    this.resetPaper();
    const examId = this.paperExamId();
    const levelId = this.paperLevelId();
    if (examId === null || levelId === null) return;

    this.paperLoading.set(true);
    this.examService.getExamSubjects(examId, levelId).subscribe({
      next: (data) => {
        if (examId !== this.paperExamId() || levelId !== this.paperLevelId()) return;
        this.rows.set(data.map(d => this.newRow(d.subjectId, d.maxMarks, d.passMarks, d.iaMaxMarks ?? 0)));
        this.paperLoading.set(false);
      },
      error: (err) => {
        this.paperLoading.set(false);
        this.toast.showError(err, 'Failed to load exam subjects');
      },
    });
  }

  private newRow(subjectId: number | null, maxMarks: number | null, passMarks: number | null, iaMaxMarks: number | null = 0): PaperRow {
    return { uid: this.nextUid++, subjectId, maxMarks, passMarks, iaMaxMarks };
  }

  addRow(): void {
    this.rows.update(list => [...list, this.newRow(null, 100, 35, 0)]);
    this.paperDirty.set(true);
  }

  removeRow(uid: number): void {
    this.rows.update(list => list.filter(r => r.uid !== uid));
    this.paperDirty.set(true);
  }

  patchRow(uid: number, patch: Partial<PaperRow>): void {
    this.rows.update(list => list.map(r => r.uid === uid ? { ...r, ...patch } : r));
    this.paperDirty.set(true);
  }

  onSubjectChange(uid: number, value: number | null): void {
    this.patchRow(uid, { subjectId: value ? Number(value) : null });
  }

  onNumberChange(uid: number, field: 'maxMarks' | 'passMarks' | 'iaMaxMarks', value: number | string | null): void {
    const parsed = value === null || value === '' ? null : Number(value);
    this.patchRow(uid, { [field]: parsed === null || Number.isNaN(parsed) ? null : parsed });
  }

  rowTotal(row: PaperRow): number | null {
    if (row.maxMarks === null) return null;
    return row.maxMarks + (this.paperIsMain() ? row.iaMaxMarks ?? 0 : 0);
  }

  isSubjectTaken(uid: number, subjectId: number): boolean {
    return this.rows().some(r => r.uid !== uid && r.subjectId === subjectId);
  }

  private buildItems() {
    const withIa = this.paperIsMain();
    return this.rows().map(r => ({
      subjectId: r.subjectId as number,
      maxMarks: r.maxMarks as number,
      passMarks: r.passMarks as number,
      iaMaxMarks: withIa ? r.iaMaxMarks ?? 0 : 0,
    }));
  }

  toggleImport(): void {
    this.importOpen.update(v => !v);
    if (this.importOpen() && this.importLevelId() === null) this.importLevelId.set(this.paperLevelId());
  }

  onImportExamChange(value: number | null): void {
    this.importExamId.set(value ? Number(value) : null);
  }

  onImportLevelChange(value: number | null): void {
    this.importLevelId.set(value ? Number(value) : null);
  }

  importPaper(): void {
    const sourceId = this.importExamId();
    const levelId = this.importLevelId();
    if (sourceId === null || levelId === null) return;

    this.isImporting.set(true);
    this.examService.getExamSubjects(sourceId, levelId).subscribe({
      next: (data) => {
        this.isImporting.set(false);
        if (data.length === 0) {
          this.toast.show('No subjects are configured in that exam for the chosen class level.', 'error');
          return;
        }
        const withIa = this.paperIsMain();
        this.rows.set(data.map(d => this.newRow(d.subjectId, d.maxMarks, d.passMarks, withIa ? d.iaMaxMarks ?? 0 : 0)));
        this.paperDirty.set(true);
        this.paperSubmitted.set(false);
        this.importOpen.set(false);
        this.toast.show('Subjects loaded. Adjust the marks if needed and click Save.');
      },
      error: (err) => {
        this.isImporting.set(false);
        this.toast.showError(err, 'Failed to load subjects from that exam');
      },
    });
  }

  syncIaPanel(): void {
    const id = this.iaPanelExamId();
    if (id === null) return;
    if (!this.iaPanelExam()) {
      this.iaPanelExamId.set(null);
      return;
    }
    const valid = new Set(this.iaExams().map(e => e.id));
    this.iaSelectedIds.update(ids => ids.filter(x => valid.has(x)));
  }

  openIaPanel(examId: number | null): void {
    this.iaPanelExamId.set(examId);
    const exam = this.iaPanelExam();
    this.iaSelectedIds.set([...(exam?.iaExamIds ?? [])]);
    this.iaAggregation.set(exam?.iaAggregation ?? 'AVERAGE');
  }

  linkedCount(exam: Exam): number {
    return exam.iaExamIds?.length ?? 0;
  }

  isIaSelected(id: number): boolean {
    return this.iaSelectedIds().includes(id);
  }

  toggleIaExam(id: number): void {
    this.iaSelectedIds.update(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }

  saveIaLinks(): void {
    const exam = this.iaPanelExam();
    if (!exam) return;

    this.isSavingLinks.set(true);
    this.examService.saveIaLinks(exam.id, {
      iaAggregation: this.iaAggregation(),
      iaExamIds: this.iaSelectedIds(),
    }).subscribe({
      next: (updated) => {
        this.isSavingLinks.set(false);
        this.exams.update(list => list.map(e => e.id === updated.id ? updated : e));
        this.toast.show('IA tests saved for this exam.');
      },
      error: (err) => {
        this.isSavingLinks.set(false);
        this.toast.showError(err, 'Failed to save IA tests');
      },
    });
  }

  savePaper(): void {
    this.paperSubmitted.set(true);
    const examId = this.paperExamId();
    const levelId = this.paperLevelId();
    if (examId === null || levelId === null || !this.paperValid()) return;

    this.isSavingPaper.set(true);
    this.examService.saveExamSubjects(examId, { classLevelId: levelId, items: this.buildItems() }).subscribe({
      next: (saved) => {
        this.isSavingPaper.set(false);
        this.paperDirty.set(false);
        this.paperSubmitted.set(false);
        this.rows.set(saved.map(d => this.newRow(d.subjectId, d.maxMarks, d.passMarks, d.iaMaxMarks ?? 0)));
        this.toast.show('Exam subjects saved.');
      },
      error: (err) => {
        this.isSavingPaper.set(false);
        this.toast.showError(err, 'Failed to save exam subjects');
      },
    });
  }

  toggleCopy(): void {
    this.copyOpen.update(v => !v);
    this.copyOutcomes.set([]);
  }

  isCopyLevelSelected(id: number): boolean {
    return this.copyLevelIds().includes(id);
  }

  toggleCopyLevel(id: number): void {
    this.copyLevelIds.update(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }

  toggleAllCopyLevels(): void {
    const all = this.otherLevels().map(l => l.id);
    this.copyLevelIds.set(this.copyLevelIds().length === all.length ? [] : all);
  }

  async copyToLevels(): Promise<void> {
    this.paperSubmitted.set(true);
    const examId = this.paperExamId();
    const levelIds = this.copyLevelIds();
    if (examId === null || levelIds.length === 0 || !this.paperValid()) return;

    const items = this.buildItems();
    this.isCopying.set(true);
    this.copyOutcomes.set([]);
    const outcomes: CopyOutcome[] = [];

    for (const levelId of levelIds) {
      const levelName = this.classLevels().find(l => l.id === levelId)?.name ?? `Level ${levelId}`;
      try {
        await firstValueFrom(this.examService.saveExamSubjects(examId, { classLevelId: levelId, items }));
        outcomes.push({ levelName, error: null });
      } catch (err: any) {
        const body = err?.error;
        const message = (typeof body === 'string' ? body : body?.message) || 'Failed to save';
        outcomes.push({ levelName, error: message });
      }
      this.copyOutcomes.set([...outcomes]);
    }

    this.isCopying.set(false);
    const failed = outcomes.filter(o => o.error).length;
    if (failed === 0) {
      this.toast.show(`Copied to ${outcomes.length} class level(s).`);
      this.copyLevelIds.set([]);
    } else {
      this.toast.show(`Copied to ${outcomes.length - failed} of ${outcomes.length} class levels. ${failed} failed.`, 'error');
    }
  }
}
