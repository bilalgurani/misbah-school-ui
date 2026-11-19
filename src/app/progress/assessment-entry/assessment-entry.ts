import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AcademicYear } from '../../academics/models/academic-year.model';
import { AcademicYearService } from '../../academics/services/academic-year.service';
import { AuthService } from '../../auth/auth.service';
import { ClassSection, StudentSummaryDto } from '../../attendance/models/attendance.models';
import { AttendanceApiService } from '../../attendance/services/attendance-api.service';
import { ConfirmDialogComponent } from '../../shared/component/confirm-dialog.component';
import { LoaderComponent } from '../../shared/component/loader.component';
import { ToastService } from '../../shared/services/toast.service';
import {
  CompletionState, Criterion, RATINGS, RATING_LABELS, REMARK_MAX_LENGTH, StudentAssessment, TERMS,
  completionState, groupCriteria, ratingMap,
} from '../progress.models';
import { ProgressService } from '../progress.service';

interface RosterRow {
  student: StudentSummaryDto;
  state: CompletionState;
}

@Component({
  selector: 'app-assessment-entry',
  imports: [FormsModule, RouterLink, LoaderComponent, ConfirmDialogComponent],
  templateUrl: './assessment-entry.html',
  styleUrl: './assessment-entry.scss',
})
export class AssessmentEntry implements OnInit {
  private progress = inject(ProgressService);
  protected authService = inject(AuthService);
  private yearService = inject(AcademicYearService);
  private attendanceApi = inject(AttendanceApiService);
  private toast = inject(ToastService);

  readonly terms = TERMS;
  readonly ratings = RATINGS;
  readonly ratingLabels = RATING_LABELS;
  readonly remarkMax = REMARK_MAX_LENGTH;

  years = signal<AcademicYear[]>([]);
  sections = signal<ClassSection[]>([]);
  criteria = signal<Criterion[]>([]);
  groups = computed(() => groupCriteria(this.criteria()));

  yearId = signal<number | null>(null);
  term = signal<number>(1);
  sectionId = signal<number | null>(null);

  roster = signal<StudentSummaryDto[]>([]);
  assessments = signal<Map<number, StudentAssessment>>(new Map());
  isLoadingSetup = signal(true);
  isLoadingRoster = signal(false);
  rosterError = signal(false);

  selectedId = signal<number | null>(null);
  draftRatings = signal<Map<number, number>>(new Map());
  draftRemark = signal('');
  dirty = signal(false);
  isSaving = signal(false);
  pendingSwitchId = signal<number | null>(null);

  rows = computed<RosterRow[]>(() =>
    this.roster().map(student => ({
      student,
      state: completionState(this.criteria(), this.assessments().get(student.id)),
    })),
  );

  doneCount = computed(() => this.rows().filter(r => r.state === 'done').length);
  selected = computed(() => this.roster().find(s => s.id === this.selectedId()) ?? null);
  ratedCount = computed(() => this.criteria().filter(c => this.draftRatings().has(c.id)).length);
  canSave = computed(() => this.dirty() && !this.isSaving() && (this.ratedCount() > 0 || this.draftRemark().trim().length > 0));

  ngOnInit(): void {
    forkJoin({
      criteria: this.progress.getCriteria(),
      years: this.yearService.getAll(),
      sections: this.attendanceApi.getClassSections(),
    }).subscribe({
      next: ({ criteria, years, sections }) => {
        this.criteria.set(criteria);
        this.years.set(years);
        this.sections.set(sections);
        this.yearId.set(years.find(y => y.current)?.id ?? years[0]?.id ?? null);
        this.isLoadingSetup.set(false);
      },
      error: err => {
        this.isLoadingSetup.set(false);
        this.toast.showError(err, 'Failed to load the assessment setup.');
      },
    });
  }

  onYearChange(value: number | null): void {
    this.yearId.set(value ? Number(value) : null);
    this.loadRoster();
  }

  onTermChange(value: number): void {
    this.term.set(Number(value));
    this.loadRoster();
  }

  onSectionChange(value: number | null): void {
    this.sectionId.set(value ? Number(value) : null);
    this.loadRoster();
  }

  loadRoster(): void {
    const sectionId = this.sectionId();
    const yearId = this.yearId();
    const term = this.term();
    this.roster.set([]);
    this.assessments.set(new Map());
    this.clearSelection();
    this.rosterError.set(false);
    if (sectionId === null || yearId === null) return;

    this.isLoadingRoster.set(true);
    forkJoin({
      roster: this.attendanceApi.getStudentsBySection(sectionId),
      saved: this.progress.getSectionAssessments(sectionId, yearId, term),
    }).subscribe({
      next: ({ roster, saved }) => {
        if (sectionId !== this.sectionId() || yearId !== this.yearId() || term !== this.term()) return;
        const students = [...roster].sort((a, b) => Number(a.rollNo) - Number(b.rollNo));
        this.roster.set(students);
        this.assessments.set(new Map(saved.map(a => [a.studentId, a])));
        this.isLoadingRoster.set(false);
        const first = this.rows().find(r => r.state !== 'done') ?? this.rows()[0];
        if (first) this.openStudent(first.student.id);
      },
      error: err => {
        if (sectionId !== this.sectionId() || yearId !== this.yearId() || term !== this.term()) return;
        this.isLoadingRoster.set(false);
        this.rosterError.set(true);
        this.toast.showError(err, 'Failed to load students and saved assessments.');
      },
    });
  }

  selectStudent(id: number): void {
    if (id === this.selectedId()) return;
    if (this.dirty()) {
      this.pendingSwitchId.set(id);
      return;
    }
    this.openStudent(id);
  }

  confirmSwitch(): void {
    const id = this.pendingSwitchId();
    this.pendingSwitchId.set(null);
    if (id !== null) this.openStudent(id);
  }

  discardChanges(): void {
    const id = this.selectedId();
    if (id !== null) this.openStudent(id);
  }

  private openStudent(id: number): void {
    const saved = this.assessments().get(id);
    this.selectedId.set(id);
    this.draftRatings.set(ratingMap(saved));
    this.draftRemark.set(saved?.remark ?? '');
    this.dirty.set(false);
  }

  private clearSelection(): void {
    this.selectedId.set(null);
    this.draftRatings.set(new Map());
    this.draftRemark.set('');
    this.dirty.set(false);
  }

  setRating(criterionId: number, rating: number): void {
    this.draftRatings.update(map => new Map(map).set(criterionId, rating));
    this.dirty.set(true);
  }

  setRemark(value: string): void {
    this.draftRemark.set(value);
    this.dirty.set(true);
  }

  save(goNext: boolean): void {
    const studentId = this.selectedId();
    const yearId = this.yearId();
    if (studentId === null || yearId === null || !this.canSave()) return;

    const remark = this.draftRemark().trim();
    this.isSaving.set(true);
    this.progress.saveAssessment({
      studentId,
      academicYearId: yearId,
      term: this.term(),
      ratings: [...this.draftRatings()].map(([criterionId, rating]) => ({ criterionId, rating })),
      remark: remark || null,
    }).subscribe({
      next: saved => {
        this.isSaving.set(false);
        this.dirty.set(false);
        this.assessments.update(map => new Map(map).set(studentId, saved));
        this.toast.show('Assessment saved.');
        if (goNext) this.openNext(studentId);
      },
      error: err => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Failed to save the assessment.');
      },
    });
  }

  private openNext(currentId: number): void {
    const rows = this.rows();
    const index = rows.findIndex(r => r.student.id === currentId);
    const next = rows.slice(index + 1).find(r => r.state !== 'done') ?? rows[index + 1];
    if (next) this.openStudent(next.student.id);
  }

  ratingOf(criterionId: number): number | undefined {
    return this.draftRatings().get(criterionId);
  }
}
