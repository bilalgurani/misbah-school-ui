import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { EnrollmentService } from '../../../academics/services/enrollment.service';
import { AuthService } from '../../../auth/auth.service';
import { ClassSectionItem, SectionSeats, isSectionFull, seatsText } from '../../../classes/models/class.models';
import { ClassApiService } from '../../../classes/services/class-api.service';
import { ToastService } from '../../../shared/services/toast.service';

export interface ChangeSectionStudent {
  id: number;
  name: string;
  // The students list gives the class as a name such as "1 - A"; other screens may give the id.
  classSectionId: unknown;
}

/** Moves one student to another section. Teachers and admins can both use it. */
@Component({
  selector: 'app-change-section-modal',
  imports: [FormsModule, RouterLink],
  templateUrl: './change-section-modal.html',
  styleUrl: './change-section-modal.scss',
})
export class ChangeSectionModal implements OnInit {
  private classApi = inject(ClassApiService);
  private enrollmentService = inject(EnrollmentService);
  private toast = inject(ToastService);
  protected auth = inject(AuthService);

  readonly student = input.required<ChangeSectionStudent>();
  // True when the student was moved, so the list behind the dialog can refresh.
  readonly closed = output<boolean>();

  sections = signal<ClassSectionItem[]>([]);
  seats = signal<Map<number, SectionSeats>>(new Map());
  isLoading = signal(true);

  targetId = signal<number | null>(null);
  rollNo = signal('');
  private rollEdited = false;
  isLoadingRoll = signal(false);
  isSaving = signal(false);

  currentSection = computed(() => {
    const value = this.student().classSectionId;
    return this.sections().find(s => s.displayName === String(value) || s.id === Number(value)) ?? null;
  });

  options = computed(() => this.sections()
    .filter(s => s.id !== this.currentSection()?.id)
    .map(s => ({ section: s, seatsText: seatsText(this.seats().get(s.id)), full: isSectionFull(this.seats().get(s.id)) })));

  targetIsFull = computed(() => isSectionFull(this.seats().get(this.targetId() ?? -1)));
  targetName = computed(() => this.sections().find(s => s.id === this.targetId())?.displayName ?? '');
  canMove = computed(() =>
    this.targetId() !== null && !this.targetIsFull() && this.rollNo().trim().length > 0 && !this.isSaving());

  ngOnInit(): void {
    forkJoin({
      sections: this.classApi.getSections(),
      // Without seat counts the dialog still works; the server refuses a move into a full section.
      seats: this.classApi.getSeats().pipe(catchError(() => of([] as SectionSeats[]))),
    }).subscribe({
      next: ({ sections, seats }) => {
        this.sections.set(sections);
        this.seats.set(new Map(seats.map(s => [s.classSectionId, s])));
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.toast.showError(err, 'Failed to load the classes.');
      },
    });
  }

  onTargetChange(value: number | null): void {
    const id = value === null ? null : Number(value);
    this.targetId.set(id);
    this.rollEdited = false;
    this.rollNo.set('');
    if (id === null) return;

    this.isLoadingRoll.set(true);
    this.enrollmentService.getNextRollNo(id).subscribe({
      next: ({ rollNo }) => {
        this.isLoadingRoll.set(false);
        if (this.targetId() === id && !this.rollEdited) this.rollNo.set(String(rollNo));
      },
      error: () => this.isLoadingRoll.set(false),
    });
  }

  onRollChange(value: string): void {
    this.rollEdited = true;
    this.rollNo.set(value);
  }

  move(): void {
    const targetId = this.targetId();
    if (targetId === null || !this.canMove()) return;

    this.isSaving.set(true);
    this.enrollmentService.moveStudents([{
      studentId: this.student().id,
      targetClassSectionId: targetId,
      targetRollNo: this.rollNo().trim(),
    }]).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast.show(`${this.student().name} moved to ${this.targetName()}.`);
        this.closed.emit(true);
      },
      error: err => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Failed to move the student.');
      },
    });
  }

  cancel(): void {
    this.closed.emit(false);
  }
}
