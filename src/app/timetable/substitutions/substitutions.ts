import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TeacherService } from '../../teachers/teacher.service';
import { ToastService } from '../../shared/services/toast.service';
import { LoaderComponent } from '../../shared/component/loader.component';
import { FreeTeacher, SubLesson, SubstitutionDay, TimetableService } from '../timetable.service';
import { dayLong, timeRange, todayIso } from '../timetable.util';

@Component({
  imports: [FormsModule, RouterLink, LoaderComponent],
  selector: 'app-substitutions',
  styleUrl: './substitutions.scss',
  templateUrl: './substitutions.html',
})
export class Substitutions implements OnInit {
  private api = inject(TimetableService);
  private teacherService = inject(TeacherService);
  private toast = inject(ToastService);

  readonly dayLong = dayLong;
  readonly timeRange = timeRange;

  date = signal<string>(todayIso());
  data = signal<SubstitutionDay | null>(null);
  loading = signal(false);
  teachers = signal<{ id: number; name: string }[]>([]);

  otherTeacherId = signal<number | null>(null);
  otherLessons = signal<SubLesson[]>([]);

  target = signal<SubLesson | null>(null);
  free = signal<FreeTeacher[]>([]);
  freeLoading = signal(false);
  chosenId = signal<number | null>(null);
  reason = signal('');
  isSaving = signal(false);

  ngOnInit(): void {
    this.teacherService.getTeachers().subscribe({
      next: list => this.teachers.set(list.map(t => ({ id: t.id, name: t.name }))),
      error: err => this.toast.showError(err, 'Failed to load teachers'),
    });
    this.load();
  }

  onDate(value: string): void {
    this.date.set(value);
    this.otherLessons.set([]);
    this.load();
    if (this.otherTeacherId()) this.loadOther();
  }

  load(): void {
    if (!this.date()) return;
    this.loading.set(true);
    this.api.getSubstitutions(this.date()).subscribe({
      next: data => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.toast.showError(err, 'Failed to load lessons that need cover');
      },
    });
  }

  onOtherTeacher(value: number | string | null): void {
    this.otherTeacherId.set(value ? Number(value) : null);
    this.otherLessons.set([]);
    if (this.otherTeacherId()) this.loadOther();
  }

  loadOther(): void {
    const id = this.otherTeacherId();
    if (!id) return;
    this.api.getTeacherLessons(this.date(), id).subscribe({
      next: list => this.otherLessons.set(list),
      error: err => this.toast.showError(err, 'Failed to load their lessons'),
    });
  }

  reasonText(l: SubLesson): string {
    return l.absentReason === 'LEAVE' ? 'On approved leave' : l.absentReason === 'ABSENT' ? 'Marked absent' : '';
  }

  assign(lesson: SubLesson): void {
    this.target.set(lesson);
    this.chosenId.set(lesson.substituteTeacherId);
    this.reason.set(lesson.reason ?? (lesson.absentReason === 'LEAVE' ? 'Leave' : ''));
    this.free.set([]);
    this.freeLoading.set(true);
    this.api.getFreeTeachers(lesson.entryId, this.date()).subscribe({
      next: list => {
        this.free.set(list);
        this.freeLoading.set(false);
      },
      error: err => {
        this.freeLoading.set(false);
        this.toast.showError(err, 'Failed to find free teachers');
      },
    });
  }

  close(): void {
    if (!this.isSaving()) this.target.set(null);
  }

  save(): void {
    const lesson = this.target();
    const teacherId = this.chosenId();
    if (!lesson || !teacherId) {
      this.toast.show('Choose a teacher to cover.', 'error');
      return;
    }
    this.isSaving.set(true);
    this.api.saveSubstitution({ entryId: lesson.entryId, date: this.date(), substituteTeacherId: teacherId, reason: this.reason().trim() || null }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.target.set(null);
        this.toast.show('Cover arranged.');
        this.load();
        this.loadOther();
      },
      error: err => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Could not arrange cover');
      },
    });
  }

  remove(lesson: SubLesson): void {
    if (!lesson.substitutionId) return;
    this.api.deleteSubstitution(lesson.substitutionId).subscribe({
      next: () => {
        this.toast.show('Cover removed.');
        this.load();
        this.loadOther();
      },
      error: err => this.toast.showError(err, 'Could not remove the cover'),
    });
  }
}
