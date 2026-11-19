import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription, catchError, forkJoin, of } from 'rxjs';
import { AcademicYear } from '../../academics/models/academic-year.model';
import { AcademicYearService } from '../../academics/services/academic-year.service';
import { ClassSection } from '../../attendance/models/attendance.models';
import { AttendanceApiService } from '../../attendance/services/attendance-api.service';
import { LoaderComponent } from '../../shared/component/loader.component';
import { ToastService } from '../../shared/services/toast.service';
import { ProgressCardData } from '../progress-card.data';
import { ProgressCardSheet } from '../progress-card-sheet/progress-card-sheet';
import { ClassCardsResponse, Criterion, TERMS, completionState } from '../progress.models';
import { ProgressService } from '../progress.service';

const MAX_NAMES_SHOWN = 8;

@Component({
  selector: 'app-class-cards',
  imports: [FormsModule, RouterLink, LoaderComponent, ProgressCardSheet],
  templateUrl: './class-cards.html',
  styleUrl: './class-cards.scss',
})
export class ClassCards implements OnInit, OnDestroy {
  private progress = inject(ProgressService);
  private yearService = inject(AcademicYearService);
  private attendanceApi = inject(AttendanceApiService);
  private toast = inject(ToastService);
  private loadSub?: Subscription;

  readonly terms = TERMS;

  years = signal<AcademicYear[]>([]);
  sections = signal<ClassSection[]>([]);
  criteria = signal<Criterion[]>([]);

  yearId = signal<number | null>(null);
  term = signal<number>(1);
  sectionId = signal<number | null>(null);

  cards = signal<ProgressCardData[]>([]);
  isSetupLoading = signal(true);
  isLoading = signal(false);
  loadFailed = signal(false);
  hasLoaded = signal(false);

  // Students whose skills and remark are missing or only partly filled in, so the teacher can finish them first.
  pendingNames = computed(() => this.namesWhere('pending'));
  partialNames = computed(() => this.namesWhere('partial'));
  failedCount = computed(() => this.cards().filter(c => c.academicsFailed || c.attendanceFailed).length);

  private namesWhere(state: 'pending' | 'partial'): string[] {
    const criteria = this.criteria();
    return this.cards()
      .filter(c => completionState(criteria, c.assessment ?? undefined) === state)
      .map(c => c.name);
  }

  ngOnInit(): void {
    forkJoin({
      years: this.yearService.getAll(),
      sections: this.attendanceApi.getClassSections(),
      criteria: this.progress.getCriteria().pipe(catchError(() => of([] as Criterion[]))),
    }).subscribe({
      next: ({ years, sections, criteria }) => {
        this.years.set(years);
        this.sections.set(sections);
        this.criteria.set(criteria);
        this.yearId.set(years.find(y => y.current)?.id ?? years[0]?.id ?? null);
        this.isSetupLoading.set(false);
      },
      error: err => {
        this.isSetupLoading.set(false);
        this.toast.showError(err, 'Failed to load years and classes.');
      },
    });
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
  }

  onYearChange(value: number | null): void {
    this.yearId.set(value ? Number(value) : null);
    this.load();
  }

  onTermChange(value: number): void {
    this.term.set(Number(value));
    this.load();
  }

  onSectionChange(value: number | null): void {
    this.sectionId.set(value ? Number(value) : null);
    this.load();
  }

  load(): void {
    this.loadSub?.unsubscribe();
    this.cards.set([]);
    this.hasLoaded.set(false);
    this.loadFailed.set(false);

    const sectionId = this.sectionId();
    const yearId = this.yearId();
    if (sectionId === null || yearId === null) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.loadSub = this.progress.getClassCards(sectionId, yearId, this.term()).subscribe({
      next: response => {
        this.cards.set(this.toCardData(response));
        this.isLoading.set(false);
        this.hasLoaded.set(true);
      },
      error: err => {
        this.isLoading.set(false);
        this.loadFailed.set(true);
        this.toast.showError(err, 'Failed to load the class.');
      },
    });
  }

  private toCardData(response: ClassCardsResponse): ProgressCardData[] {
    return response.cards.map(card => ({
      studentId: card.studentId,
      name: card.academics?.name ?? card.name,
      rollNo: card.academics?.rollNo ?? card.rollNo,
      className: card.academics?.className ?? response.className,
      fatherName: card.academics?.fatherName ?? null,
      schoolName: card.academics?.schoolName ?? null,
      yearName: response.academicYear,
      term: response.term,
      academics: card.academics,
      attendance: card.attendance,
      assessment: card.assessment,
      academicsFailed: card.academicsFailed,
      attendanceFailed: card.attendanceFailed,
    }));
  }

  shown(names: string[]): string {
    const head = names.slice(0, MAX_NAMES_SHOWN).join(', ');
    return names.length > MAX_NAMES_SHOWN ? `${head} and ${names.length - MAX_NAMES_SHOWN} more` : head;
  }

  print(): void {
    window.print();
  }
}
