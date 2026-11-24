import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { AttendanceApiService } from '../../attendance/services/attendance-api.service';
import { ClassSection } from '../../attendance/models/attendance.models';
import { TeacherService } from '../../teachers/teacher.service';
import { ToastService } from '../../shared/services/toast.service';
import { LoaderComponent } from '../../shared/component/loader.component';
import {
  CellOption, ClassTimetable, Entry, Period, TeacherDay, TeacherLoad, TeacherTimetable, TimetableService,
} from '../timetable.service';
import { ALL_DAYS, dayLong, dayShort, formatTime, periodDays, runsOn, timeRange, todayIso } from '../timetable.util';

type Tab = 'class' | 'teacher' | 'day';

interface EditTarget {
  day: number;
  period: Period;
  entry: Entry | null;
}

@Component({
  imports: [FormsModule, RouterLink, LoaderComponent],
  selector: 'app-timetable-view',
  styleUrl: './timetable-view.scss',
  templateUrl: './timetable-view.html',
})
export class TimetableView implements OnInit {
  private api = inject(TimetableService);
  private attendanceApi = inject(AttendanceApiService);
  private teacherService = inject(TeacherService);
  private toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly dayShort = dayShort;
  readonly dayLong = dayLong;
  readonly formatTime = formatTime;
  readonly timeRange = timeRange;
  readonly allDays = ALL_DAYS;

  tab = signal<Tab>('class');
  sections = signal<ClassSection[]>([]);
  teachers = signal<{ id: number; name: string }[]>([]);

  // class tab
  sectionId = signal<number | null>(null);
  classData = signal<ClassTimetable | null>(null);
  classLoading = signal(false);
  editing = signal<EditTarget | null>(null);
  options = signal<CellOption[]>([]);
  optionsLoading = signal(false);
  isSaving = signal(false);
  copyOpen = signal(false);
  copyFrom = signal<number>(1);
  copyTo = signal<ReadonlySet<number>>(new Set());

  // teacher and day tabs
  teacherId = signal<number | null>(null);
  teacherData = signal<TeacherTimetable | null>(null);
  teacherLoading = signal(false);
  loads = signal<TeacherLoad[]>([]);
  date = signal<string>(todayIso());
  dayData = signal<TeacherDay | null>(null);
  dayLoading = signal(false);

  cellMap = computed(() => {
    const map = new Map<string, Entry>();
    for (const e of this.classData()?.entries ?? []) map.set(`${e.dayOfWeek}-${e.periodId}`, e);
    return map;
  });

  teacherDays = computed(() => {
    const entries = this.teacherData()?.entries ?? [];
    return ALL_DAYS.filter(d => d <= 6 || entries.some(e => e.dayOfWeek === d));
  });

  entriesOn(day: number) {
    return (this.teacherData()?.entries ?? []).filter(e => e.dayOfWeek === day);
  }

  ngOnInit(): void {
    this.attendanceApi.getClassSections().subscribe({
      next: list => this.sections.set(list),
      error: err => this.toast.showError(err, 'Failed to load classes'),
    });
    this.teacherService.getTeachers().subscribe({
      next: list => {
        this.teachers.set(list.map(t => ({ id: t.id, name: t.name })));
        const own = Number(this.auth.currentTeacherId());
        if (this.auth.isTeacher() && own) this.teacherId.set(own);
      },
      error: err => this.toast.showError(err, 'Failed to load teachers'),
    });
    if (this.auth.isAdmin()) this.loadLoads();
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
    if (tab === 'teacher' && this.teacherId() && !this.teacherData()) this.loadTeacher();
    if (tab === 'day' && this.teacherId()) this.loadDay();
  }

  // ---- class tab

  onSection(value: number | string | null): void {
    const id = value ? Number(value) : null;
    this.sectionId.set(id);
    this.classData.set(null);
    if (id) this.loadClass();
  }

  loadClass(): void {
    const id = this.sectionId();
    if (!id) return;
    this.classLoading.set(true);
    this.api.getClassTimetable(id).subscribe({
      next: data => {
        this.classData.set(data);
        this.classLoading.set(false);
      },
      error: err => {
        this.classLoading.set(false);
        this.toast.showError(err, 'Failed to load the timetable');
      },
    });
  }

  runs(period: Period, day: number): boolean {
    const schedule = this.classData()?.schedule;
    return !!schedule && runsOn(period, schedule, day);
  }

  daysOf(period: Period): number[] {
    const schedule = this.classData()?.schedule;
    return schedule ? periodDays(period, schedule) : [];
  }

  cell(day: number, period: Period): Entry | null {
    return this.cellMap().get(`${day}-${period.id}`) ?? null;
  }

  openCell(day: number, period: Period): void {
    if (!this.auth.isAdmin() || period.kind !== 'PERIOD' || !this.runs(period, day)) return;
    this.editing.set({ day, period, entry: this.cell(day, period) });
    this.options.set([]);
    this.optionsLoading.set(true);
    this.api.getOptions(this.sectionId()!, day, period.id).subscribe({
      next: list => {
        this.options.set(list);
        this.optionsLoading.set(false);
      },
      error: err => {
        this.optionsLoading.set(false);
        this.toast.showError(err, 'Failed to load subjects');
      },
    });
  }

  closeEdit(): void {
    if (!this.isSaving()) this.editing.set(null);
  }

  choose(option: CellOption): void {
    const target = this.editing();
    if (!target || option.busy) return;
    this.isSaving.set(true);
    this.api.saveEntry({ classSectionId: this.sectionId()!, dayOfWeek: target.day, periodId: target.period.id, subjectId: option.subjectId }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.editing.set(null);
        this.loadClass();
        if (this.auth.isAdmin()) this.loadLoads();
      },
      error: err => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Could not place the lesson');
      },
    });
  }

  clearCell(): void {
    const entry = this.editing()?.entry;
    if (!entry) return;
    this.isSaving.set(true);
    this.api.deleteEntry(entry.id).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.editing.set(null);
        this.loadClass();
        this.loadLoads();
      },
      error: err => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Could not clear the lesson');
      },
    });
  }

  openCopy(): void {
    const first = this.classData()?.schedule?.days[0] ?? 1;
    this.copyFrom.set(first);
    this.copyTo.set(new Set());
    this.copyOpen.set(true);
  }

  toggleCopyTo(day: number): void {
    this.copyTo.update(set => {
      const next = new Set(set);
      if (!next.delete(day)) next.add(day);
      return next;
    });
  }

  copyTargets(): number[] {
    return (this.classData()?.schedule?.days ?? []).filter(d => d !== Number(this.copyFrom()));
  }

  doCopy(): void {
    const targets = [...this.copyTo()].filter(d => d !== Number(this.copyFrom()));
    if (targets.length === 0) {
      this.toast.show('Choose at least one day to copy to.', 'error');
      return;
    }
    this.isSaving.set(true);
    this.api.copyDay(this.sectionId()!, Number(this.copyFrom()), targets).subscribe({
      next: result => {
        this.isSaving.set(false);
        this.copyOpen.set(false);
        this.toast.show(result.skipped.length
          ? `Copied ${result.copied} lesson(s). Skipped: ${result.skipped.join(' | ')}`
          : `Copied ${result.copied} lesson(s).`, result.skipped.length ? 'error' : 'success');
        this.loadClass();
        this.loadLoads();
      },
      error: err => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Could not copy the day');
      },
    });
  }

  print(): void {
    window.print();
  }

  // ---- teacher tab

  onTeacher(value: number | string | null): void {
    const id = value ? Number(value) : null;
    this.teacherId.set(id);
    this.teacherData.set(null);
    this.dayData.set(null);
    if (id && this.tab() === 'teacher') this.loadTeacher();
    if (id && this.tab() === 'day') this.loadDay();
  }

  loadTeacher(): void {
    const id = this.teacherId();
    if (!id) return;
    this.teacherLoading.set(true);
    this.api.getTeacherTimetable(id).subscribe({
      next: data => {
        this.teacherData.set(data);
        this.teacherLoading.set(false);
      },
      error: err => {
        this.teacherLoading.set(false);
        this.toast.showError(err, 'Failed to load the teacher timetable');
      },
    });
  }

  loadLoads(): void {
    this.api.getLoads().subscribe({ next: list => this.loads.set(list), error: () => this.loads.set([]) });
  }

  // ---- day tab

  onDate(value: string): void {
    this.date.set(value);
    this.loadDay();
  }

  loadDay(): void {
    const id = this.teacherId();
    if (!id || !this.date()) return;
    this.dayLoading.set(true);
    this.api.getTeacherDay(id, this.date()).subscribe({
      next: data => {
        this.dayData.set(data);
        this.dayLoading.set(false);
      },
      error: err => {
        this.dayLoading.set(false);
        this.toast.showError(err, 'Failed to load the day');
      },
    });
  }
}
