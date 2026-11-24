import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AttendanceApiService } from '../../attendance/services/attendance-api.service';
import { ClassSection } from '../../attendance/models/attendance.models';
import { ExamService, Subject } from '../../exams/exam.service';
import { TeacherService } from '../../teachers/teacher.service';
import { ToastService } from '../../shared/services/toast.service';
import { LoaderComponent } from '../../shared/component/loader.component';
import { ConfirmDialogComponent } from '../../shared/component/confirm-dialog.component';
import {
  Period, PeriodKind, PeriodRequest, Schedule, SectionSchedule, SubjectTeacher, TimetableService,
} from '../timetable.service';
import { ALL_DAYS, dayShort, timeRange } from '../timetable.util';

interface ScheduleDraft {
  id: number | null;
  name: string;
  days: number[];
  isDefault: boolean;
}

interface PeriodDraft {
  id: number | null;
  scheduleId: number;
  name: string;
  kind: PeriodKind;
  startTime: string;
  endTime: string;
  limitDays: boolean;
  days: number[];
}

const KIND_LABELS: Record<PeriodKind, string> = { PERIOD: 'Period', BREAK: 'Break', LUNCH: 'Lunch', OTHER: 'Other' };

// A sensible starting day; the admin edits the times to match the school.
const QUICK_START: PeriodRequest[] = [
  { name: 'Assembly', kind: 'OTHER', startTime: '08:30', endTime: '08:45', days: null },
  { name: 'Period 1', kind: 'PERIOD', startTime: '08:45', endTime: '09:30', days: null },
  { name: 'Period 2', kind: 'PERIOD', startTime: '09:30', endTime: '10:15', days: null },
  { name: 'Short break', kind: 'BREAK', startTime: '10:15', endTime: '10:30', days: null },
  { name: 'Period 3', kind: 'PERIOD', startTime: '10:30', endTime: '11:15', days: null },
  { name: 'Period 4', kind: 'PERIOD', startTime: '11:15', endTime: '12:00', days: null },
  { name: 'Lunch', kind: 'LUNCH', startTime: '12:00', endTime: '12:40', days: null },
  { name: 'Period 5', kind: 'PERIOD', startTime: '12:40', endTime: '13:25', days: null },
  { name: 'Period 6', kind: 'PERIOD', startTime: '13:25', endTime: '14:10', days: null },
  { name: 'Period 7', kind: 'PERIOD', startTime: '14:10', endTime: '14:55', days: null },
];

@Component({
  imports: [FormsModule, RouterLink, LoaderComponent, ConfirmDialogComponent],
  selector: 'app-timetable-setup',
  styleUrl: './timetable-setup.scss',
  templateUrl: './timetable-setup.html',
})
export class TimetableSetup implements OnInit {
  private api = inject(TimetableService);
  private attendanceApi = inject(AttendanceApiService);
  private examService = inject(ExamService);
  private teacherService = inject(TeacherService);
  private toast = inject(ToastService);

  readonly allDays = ALL_DAYS;
  readonly dayShort = dayShort;
  readonly timeRange = timeRange;
  readonly kinds = Object.entries(KIND_LABELS).map(([value, label]) => ({ value: value as PeriodKind, label }));
  readonly kindLabel = (kind: PeriodKind): string => KIND_LABELS[kind];

  schedules = signal<Schedule[]>([]);
  schedulesLoading = signal(true);
  sectionSchedules = signal<SectionSchedule[]>([]);
  sections = signal<ClassSection[]>([]);
  subjects = signal<Subject[]>([]);
  teachers = signal<{ id: number; name: string }[]>([]);

  scheduleDraft = signal<ScheduleDraft | null>(null);
  periodDraft = signal<PeriodDraft | null>(null);
  isSaving = signal(false);
  confirm = signal<{ message: string; action: () => void } | null>(null);

  mappingSectionId = signal<number | null>(null);
  mappings = signal<SubjectTeacher[]>([]);
  mappingsLoading = signal(false);
  newSubjectId = signal<number | null>(null);
  newTeacherId = signal<number | null>(null);
  newPeriods = signal<number | null>(null);

  unmappedSubjects = computed(() => {
    const used = new Set(this.mappings().map(m => m.subjectId));
    return this.subjects().filter(s => !used.has(s.id));
  });

  ngOnInit(): void {
    this.loadSchedules();
    this.loadSectionSchedules();
    this.attendanceApi.getClassSections().subscribe({
      next: list => this.sections.set(list),
      error: err => this.toast.showError(err, 'Failed to load classes'),
    });
    this.examService.getSubjects().subscribe({
      next: list => this.subjects.set(list),
      error: err => this.toast.showError(err, 'Failed to load subjects'),
    });
    this.teacherService.getTeachers().subscribe({
      next: list => this.teachers.set(list.map(t => ({ id: t.id, name: t.name }))),
      error: err => this.toast.showError(err, 'Failed to load teachers'),
    });
  }

  // ---- schedules

  loadSchedules(): void {
    this.schedulesLoading.set(true);
    this.api.getSchedules().subscribe({
      next: list => {
        this.schedules.set(list);
        this.schedulesLoading.set(false);
      },
      error: err => {
        this.schedulesLoading.set(false);
        this.toast.showError(err, 'Failed to load schedules');
      },
    });
  }

  loadSectionSchedules(): void {
    this.api.getSectionSchedules().subscribe({
      next: list => this.sectionSchedules.set(list),
      error: err => this.toast.showError(err, 'Failed to load class schedules'),
    });
  }

  newSchedule(): void {
    this.scheduleDraft.set({ id: null, name: '', days: [1, 2, 3, 4, 5, 6], isDefault: this.schedules().length === 0 });
  }

  editSchedule(s: Schedule): void {
    this.scheduleDraft.set({ id: s.id, name: s.name, days: [...s.days], isDefault: s.isDefault });
  }

  toggleDraftDay(day: number): void {
    const d = this.scheduleDraft();
    if (!d) return;
    const days = d.days.includes(day) ? d.days.filter(x => x !== day) : [...d.days, day].sort();
    this.scheduleDraft.set({ ...d, days });
  }

  saveSchedule(): void {
    const d = this.scheduleDraft();
    if (!d) return;
    if (!d.name.trim()) {
      this.toast.show('Enter a name for the schedule.', 'error');
      return;
    }
    if (d.days.length === 0) {
      this.toast.show('Choose at least one working day.', 'error');
      return;
    }
    const request = { name: d.name.trim(), days: d.days, isDefault: d.isDefault };
    this.isSaving.set(true);
    const call = d.id ? this.api.updateSchedule(d.id, request) : this.api.createSchedule(request);
    call.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.scheduleDraft.set(null);
        this.loadSchedules();
        this.loadSectionSchedules();
      },
      error: err => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Could not save the schedule');
      },
    });
  }

  askDeleteSchedule(s: Schedule): void {
    this.confirm.set({
      message: `Delete the schedule "${s.name}" and all its periods?`,
      action: () => this.api.deleteSchedule(s.id).subscribe({
        next: () => {
          this.loadSchedules();
          this.loadSectionSchedules();
        },
        error: err => this.toast.showError(err, 'Could not delete the schedule'),
      }),
    });
  }

  // ---- periods

  newPeriod(s: Schedule): void {
    const last = s.periods.filter(p => !p.days).at(-1);
    this.periodDraft.set({
      id: null, scheduleId: s.id, name: '', kind: 'PERIOD', startTime: last?.endTime ?? '09:00', endTime: '',
      limitDays: false, days: [...s.days],
    });
  }

  editPeriod(p: Period): void {
    this.periodDraft.set({
      id: p.id, scheduleId: p.scheduleId, name: p.name, kind: p.kind, startTime: p.startTime, endTime: p.endTime,
      limitDays: !!p.days, days: [...(p.days ?? this.schedules().find(s => s.id === p.scheduleId)?.days ?? [])],
    });
  }

  toggleDraftPeriodDay(day: number): void {
    const d = this.periodDraft();
    if (!d) return;
    const days = d.days.includes(day) ? d.days.filter(x => x !== day) : [...d.days, day].sort();
    this.periodDraft.set({ ...d, days });
  }

  savePeriod(): void {
    const d = this.periodDraft();
    if (!d) return;
    if (!d.name.trim() || !d.startTime || !d.endTime) {
      this.toast.show('Enter a name, start time and end time.', 'error');
      return;
    }
    if (d.limitDays && d.days.length === 0) {
      this.toast.show('Choose the days this slot runs on.', 'error');
      return;
    }
    const request: PeriodRequest = {
      name: d.name.trim(), kind: d.kind, startTime: d.startTime, endTime: d.endTime, days: d.limitDays ? d.days : null,
    };
    this.isSaving.set(true);
    const call = d.id ? this.api.updatePeriod(d.id, request) : this.api.addPeriod(d.scheduleId, request);
    call.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.periodDraft.set(null);
        this.loadSchedules();
      },
      error: err => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Could not save the slot');
      },
    });
  }

  askDeletePeriod(p: Period): void {
    this.confirm.set({
      message: `Delete "${p.name}"?`,
      action: () => this.api.deletePeriod(p.id).subscribe({
        next: () => this.loadSchedules(),
        error: err => this.toast.showError(err, 'Could not delete the slot'),
      }),
    });
  }

  quickStart(s: Schedule): void {
    this.isSaving.set(true);
    this.api.addPeriods(s.id, QUICK_START).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast.show('Standard day added. Edit the times to match your school.');
        this.loadSchedules();
      },
      error: err => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Could not add the standard day');
      },
    });
  }

  daysText(days: number[] | null, fallback: number[]): string {
    const list = days ?? fallback;
    return list.length === fallback.length && !days ? 'Every day' : list.map(dayShort).join(', ');
  }

  // ---- class -> schedule

  setSectionSchedule(row: SectionSchedule, value: number | string | null): void {
    const scheduleId = value === null || value === '' ? null : Number(value);
    this.api.setSectionSchedule(row.classSectionId, scheduleId).subscribe({
      next: () => this.loadSectionSchedules(),
      error: err => {
        this.toast.showError(err, 'Could not change the schedule');
        this.loadSectionSchedules();
      },
    });
  }

  // ---- subject -> teacher

  onMappingSection(value: number | string | null): void {
    const id = value ? Number(value) : null;
    this.mappingSectionId.set(id);
    this.mappings.set([]);
    this.newSubjectId.set(null);
    this.newTeacherId.set(null);
    this.newPeriods.set(null);
    if (id) this.loadMappings();
  }

  loadMappings(): void {
    const id = this.mappingSectionId();
    if (!id) return;
    this.mappingsLoading.set(true);
    this.api.getSubjectTeachers(id).subscribe({
      next: list => {
        this.mappings.set(list);
        this.mappingsLoading.set(false);
      },
      error: err => {
        this.mappingsLoading.set(false);
        this.toast.showError(err, 'Failed to load subjects');
      },
    });
  }

  addMapping(): void {
    const sectionId = this.mappingSectionId();
    if (!sectionId || !this.newSubjectId() || !this.newTeacherId()) {
      this.toast.show('Choose a subject and a teacher.', 'error');
      return;
    }
    this.persistMapping(sectionId, this.newSubjectId()!, this.newTeacherId()!, this.newPeriods(), () => {
      this.newSubjectId.set(null);
      this.newTeacherId.set(null);
      this.newPeriods.set(null);
    });
  }

  changeTeacher(m: SubjectTeacher, value: number | string): void {
    this.persistMapping(m.classSectionId, m.subjectId, Number(value), m.periodsPerWeek);
  }

  changePeriods(m: SubjectTeacher, value: number | string | null): void {
    const n = value === null || value === '' ? null : Number(value);
    this.persistMapping(m.classSectionId, m.subjectId, m.teacherId, n);
  }

  private persistMapping(classSectionId: number, subjectId: number, teacherId: number, periodsPerWeek: number | null, done?: () => void): void {
    this.api.saveSubjectTeacher({ classSectionId, subjectId, teacherId, periodsPerWeek }).subscribe({
      next: () => {
        done?.();
        this.loadMappings();
      },
      error: err => {
        this.toast.showError(err, 'Could not save');
        this.loadMappings();
      },
    });
  }

  askDeleteMapping(m: SubjectTeacher): void {
    this.confirm.set({
      message: `Remove ${m.subjectName} (${m.teacherName}) from this class?`,
      action: () => this.api.deleteSubjectTeacher(m.id).subscribe({
        next: () => this.loadMappings(),
        error: err => this.toast.showError(err, 'Could not remove it'),
      }),
    });
  }

  runConfirm(): void {
    const c = this.confirm();
    this.confirm.set(null);
    c?.action();
  }
}
