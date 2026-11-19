import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { EnrollmentService } from '../../../academics/services/enrollment.service';
import { StudentSummaryDto } from '../../../attendance/models/attendance.models';
import { AttendanceApiService } from '../../../attendance/services/attendance-api.service';
import { AuthService } from '../../../auth/auth.service';
import { ClassSectionItem, SectionSeats, seatsLeft, seatsText } from '../../../classes/models/class.models';
import { ClassApiService } from '../../../classes/services/class-api.service';
import { ConfirmDialogComponent } from '../../../shared/component/confirm-dialog.component';
import { LoaderComponent } from '../../../shared/component/loader.component';
import { ToastService } from '../../../shared/services/toast.service';

/** Moves many students from one section to another in one go, for example when a class is split or rebalanced. */
@Component({
  selector: 'app-move-students',
  imports: [FormsModule, RouterLink, LoaderComponent, ConfirmDialogComponent],
  templateUrl: './move-students.html',
  styleUrl: './move-students.scss',
})
export class MoveStudents implements OnInit {
  private classApi = inject(ClassApiService);
  private attendanceApi = inject(AttendanceApiService);
  private enrollmentService = inject(EnrollmentService);
  private toast = inject(ToastService);
  protected auth = inject(AuthService);

  sections = signal<ClassSectionItem[]>([]);
  seats = signal<Map<number, SectionSeats>>(new Map());
  isSetupLoading = signal(true);

  fromId = signal<number | null>(null);
  toId = signal<number | null>(null);
  students = signal<StudentSummaryDto[]>([]);
  isLoadingStudents = signal(false);

  selected = signal<Set<number>>(new Set());
  nextRoll = signal<number | null>(null);
  rollOverrides = signal<Map<number, string>>(new Map());

  confirming = signal(false);
  isSaving = signal(false);

  toOptions = computed(() => this.sections()
    .filter(s => s.id !== this.fromId())
    .map(s => ({ section: s, text: seatsText(this.seats().get(s.id)) })));

  toName = computed(() => this.sections().find(s => s.id === this.toId())?.displayName ?? '');
  fromName = computed(() => this.sections().find(s => s.id === this.fromId())?.displayName ?? '');

  // The selected students in roll order, each with the roll number they'd get. A typed number wins over the suggestion.
  rows = computed(() => {
    const start = this.nextRoll();
    const overrides = this.rollOverrides();
    return this.students()
      .filter(s => this.selected().has(s.id))
      .map((student, index) => {
        const suggested = start === null ? '' : String(start + index);
        return { student, roll: overrides.get(student.id) ?? suggested };
      });
  });

  rollFor(studentId: number): string {
    return this.rows().find(r => r.student.id === studentId)?.roll ?? '';
  }

  seatsLeftInTarget = computed(() => seatsLeft(this.seats().get(this.toId() ?? -1)));
  overLimit = computed(() => {
    const left = this.seatsLeftInTarget();
    return left !== null && this.selected().size > left;
  });

  rollProblem = computed(() => {
    const seen = new Set<string>();
    for (const row of this.rows()) {
      const roll = row.roll.trim();
      if (!roll) return `${row.student.name} needs a roll number.`;
      if (seen.has(roll)) return `Roll number ${roll} is used twice in this move.`;
      seen.add(roll);
    }
    return null;
  });

  allSelected = computed(() => this.students().length > 0 && this.selected().size === this.students().length);

  canMove = computed(() =>
    this.fromId() !== null && this.toId() !== null && this.selected().size > 0 && this.nextRoll() !== null
    && !this.overLimit() && this.rollProblem() === null && !this.isSaving());

  ngOnInit(): void {
    forkJoin({
      sections: this.classApi.getSections(),
      seats: this.classApi.getSeats().pipe(catchError(() => of([] as SectionSeats[]))),
    }).subscribe({
      next: ({ sections, seats }) => {
        this.sections.set(sections);
        this.seats.set(new Map(seats.map(s => [s.classSectionId, s])));
        this.isSetupLoading.set(false);
      },
      error: err => {
        this.isSetupLoading.set(false);
        this.toast.showError(err, 'Failed to load the classes.');
      },
    });
  }

  onFromChange(value: number | null): void {
    this.fromId.set(value === null ? null : Number(value));
    if (this.toId() === this.fromId()) this.setTarget(null);
    this.loadStudents();
  }

  onToChange(value: number | null): void {
    this.setTarget(value === null ? null : Number(value));
  }

  private setTarget(id: number | null): void {
    this.toId.set(id);
    this.rollOverrides.set(new Map());
    this.nextRoll.set(null);
    if (id === null) return;
    this.enrollmentService.getNextRollNo(id).subscribe({
      next: ({ rollNo }) => {
        if (this.toId() === id) this.nextRoll.set(rollNo);
      },
      error: err => this.toast.showError(err, 'Could not work out the next roll number.'),
    });
  }

  private loadStudents(): void {
    this.students.set([]);
    this.selected.set(new Set());
    this.rollOverrides.set(new Map());
    const fromId = this.fromId();
    if (fromId === null) return;

    this.isLoadingStudents.set(true);
    this.attendanceApi.getStudentsBySection(fromId).subscribe({
      next: list => {
        if (this.fromId() !== fromId) return;
        this.students.set([...list].sort((a, b) => Number(a.rollNo) - Number(b.rollNo)));
        this.isLoadingStudents.set(false);
      },
      error: err => {
        this.isLoadingStudents.set(false);
        this.toast.showError(err, 'Failed to load the students.');
      },
    });
  }

  toggle(studentId: number): void {
    this.selected.update(set => {
      const next = new Set(set);
      if (!next.delete(studentId)) next.add(studentId);
      return next;
    });
  }

  toggleAll(): void {
    this.selected.set(this.allSelected() ? new Set() : new Set(this.students().map(s => s.id)));
  }

  setRoll(studentId: number, value: string): void {
    this.rollOverrides.update(map => new Map(map).set(studentId, value));
  }

  move(): void {
    const toId = this.toId();
    if (toId === null || !this.canMove()) return;

    const rows = this.rows();
    this.isSaving.set(true);
    this.enrollmentService.moveStudents(rows.map(r => ({
      studentId: r.student.id,
      targetClassSectionId: toId,
      targetRollNo: r.roll.trim(),
    }))).subscribe({
      next: ({ moved }) => {
        this.isSaving.set(false);
        this.confirming.set(false);
        this.toast.show(`Moved ${moved} ${moved === 1 ? 'student' : 'students'} to ${this.toName()}.`);
        this.afterMove();
      },
      error: err => {
        this.isSaving.set(false);
        this.confirming.set(false);
        this.toast.showError(err, 'Failed to move the students.');
      },
    });
  }

  // Seat counts and roll numbers have changed, so reload them for the next move.
  private afterMove(): void {
    this.classApi.getSeats().pipe(catchError(() => of([] as SectionSeats[])))
      .subscribe(seats => this.seats.set(new Map(seats.map(s => [s.classSectionId, s]))));
    this.loadStudents();
    this.setTarget(this.toId());
  }
}
