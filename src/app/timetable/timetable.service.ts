import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type PeriodKind = 'PERIOD' | 'BREAK' | 'LUNCH' | 'OTHER';

export interface Period {
  id: number;
  scheduleId: number;
  seq: number;
  name: string;
  kind: PeriodKind;
  startTime: string;
  endTime: string;
  days: number[] | null;
}

export interface Schedule {
  id: number;
  name: string;
  days: number[];
  isDefault: boolean;
  periods: Period[];
}

export interface ScheduleRequest {
  name: string;
  days: number[];
  isDefault: boolean;
}

export interface PeriodRequest {
  name: string;
  kind: PeriodKind;
  startTime: string;
  endTime: string;
  days: number[] | null;
}

export interface SectionSchedule {
  classSectionId: number;
  displayName: string;
  scheduleId: number | null;
  explicit: boolean;
}

export interface SubjectTeacher {
  id: number;
  classSectionId: number;
  subjectId: number;
  subjectName: string;
  teacherId: number;
  teacherName: string;
  periodsPerWeek: number | null;
  placed: number;
}

export interface Entry {
  id: number;
  classSectionId: number;
  className: string;
  dayOfWeek: number;
  periodId: number;
  subjectId: number;
  subjectName: string;
  teacherId: number | null;
  teacherName: string | null;
}

export interface ClassTimetable {
  classSectionId: number;
  className: string;
  schedule: Schedule | null;
  entries: Entry[];
}

export interface CellOption {
  subjectId: number;
  subjectName: string;
  teacherId: number;
  teacherName: string;
  busy: boolean;
  busyReason: string | null;
}

export interface TeacherEntry {
  id: number;
  classSectionId: number;
  className: string;
  dayOfWeek: number;
  periodId: number;
  periodName: string;
  startTime: string;
  endTime: string;
  subjectId: number;
  subjectName: string;
}

export interface TeacherTimetable {
  teacherId: number;
  teacherName: string;
  periodsPerWeek: number;
  entries: TeacherEntry[];
}

export interface TeacherLoad {
  teacherId: number;
  teacherName: string;
  periodsPerWeek: number;
}

export interface DayLesson {
  entryId: number;
  classSectionId: number;
  className: string;
  periodName: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  status: 'OWN' | 'COVERED_BY_OTHER' | 'COVERING';
  otherTeacherName: string | null;
}

export interface TeacherDay {
  date: string;
  dayOfWeek: number;
  workingDay: boolean;
  lessons: DayLesson[];
}

export interface SubLesson {
  entryId: number;
  classSectionId: number;
  className: string;
  periodName: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherId: number;
  teacherName: string;
  teacherAbsent: boolean;
  absentReason: 'LEAVE' | 'ABSENT' | null;
  substitutionId: number | null;
  substituteTeacherId: number | null;
  substituteTeacherName: string | null;
  reason: string | null;
}

export interface SubstitutionDay {
  date: string;
  dayOfWeek: number;
  workingDay: boolean;
  items: SubLesson[];
}

export interface FreeTeacher {
  teacherId: number;
  teacherName: string;
  periodsThatDay: number;
}

export interface CopyDayResult {
  copied: number;
  skipped: string[];
}

@Injectable({ providedIn: 'root' })
export class TimetableService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/timetable`;

  getSchedules(): Observable<Schedule[]> {
    return this.http.get<Schedule[]>(`${this.base}/schedules`);
  }

  createSchedule(request: ScheduleRequest): Observable<Schedule> {
    return this.http.post<Schedule>(`${this.base}/schedules`, request);
  }

  updateSchedule(id: number, request: ScheduleRequest): Observable<Schedule> {
    return this.http.put<Schedule>(`${this.base}/schedules/${id}`, request);
  }

  deleteSchedule(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/schedules/${id}`);
  }

  addPeriod(scheduleId: number, request: PeriodRequest): Observable<Period> {
    return this.http.post<Period>(`${this.base}/schedules/${scheduleId}/periods`, request);
  }

  addPeriods(scheduleId: number, periods: PeriodRequest[]): Observable<Schedule> {
    return this.http.post<Schedule>(`${this.base}/schedules/${scheduleId}/periods/bulk`, { periods });
  }

  updatePeriod(id: number, request: PeriodRequest): Observable<Period> {
    return this.http.put<Period>(`${this.base}/periods/${id}`, request);
  }

  deletePeriod(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/periods/${id}`);
  }

  getSectionSchedules(): Observable<SectionSchedule[]> {
    return this.http.get<SectionSchedule[]>(`${this.base}/section-schedules`);
  }

  setSectionSchedule(classSectionId: number, scheduleId: number | null): Observable<void> {
    return this.http.put<void>(`${this.base}/section-schedules`, { classSectionId, scheduleId });
  }

  getSubjectTeachers(classSectionId: number): Observable<SubjectTeacher[]> {
    const params = new HttpParams().set('classSectionId', classSectionId);
    return this.http.get<SubjectTeacher[]>(`${this.base}/subject-teachers`, { params });
  }

  saveSubjectTeacher(request: { classSectionId: number; subjectId: number; teacherId: number; periodsPerWeek: number | null }): Observable<SubjectTeacher> {
    return this.http.put<SubjectTeacher>(`${this.base}/subject-teachers`, request);
  }

  deleteSubjectTeacher(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/subject-teachers/${id}`);
  }

  getClassTimetable(sectionId: number): Observable<ClassTimetable> {
    return this.http.get<ClassTimetable>(`${this.base}/class/${sectionId}`);
  }

  getOptions(sectionId: number, dayOfWeek: number, periodId: number): Observable<CellOption[]> {
    const params = new HttpParams().set('dayOfWeek', dayOfWeek).set('periodId', periodId);
    return this.http.get<CellOption[]>(`${this.base}/class/${sectionId}/options`, { params });
  }

  saveEntry(request: { classSectionId: number; dayOfWeek: number; periodId: number; subjectId: number }): Observable<Entry> {
    return this.http.put<Entry>(`${this.base}/entries`, request);
  }

  deleteEntry(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/entries/${id}`);
  }

  copyDay(classSectionId: number, fromDay: number, toDays: number[]): Observable<CopyDayResult> {
    return this.http.post<CopyDayResult>(`${this.base}/entries/copy-day`, { classSectionId, fromDay, toDays });
  }

  getTeacherTimetable(teacherId: number): Observable<TeacherTimetable> {
    return this.http.get<TeacherTimetable>(`${this.base}/teacher/${teacherId}`);
  }

  getLoads(): Observable<TeacherLoad[]> {
    return this.http.get<TeacherLoad[]>(`${this.base}/loads`);
  }

  getTeacherDay(teacherId: number, date: string): Observable<TeacherDay> {
    const params = new HttpParams().set('date', date);
    return this.http.get<TeacherDay>(`${this.base}/teacher/${teacherId}/day`, { params });
  }

  getSubstitutions(date: string): Observable<SubstitutionDay> {
    const params = new HttpParams().set('date', date);
    return this.http.get<SubstitutionDay>(`${this.base}/substitutions`, { params });
  }

  getTeacherLessons(date: string, teacherId: number): Observable<SubLesson[]> {
    const params = new HttpParams().set('date', date).set('teacherId', teacherId);
    return this.http.get<SubLesson[]>(`${this.base}/substitutions/entries`, { params });
  }

  getFreeTeachers(entryId: number, date: string): Observable<FreeTeacher[]> {
    const params = new HttpParams().set('entryId', entryId).set('date', date);
    return this.http.get<FreeTeacher[]>(`${this.base}/substitutions/free-teachers`, { params });
  }

  saveSubstitution(request: { entryId: number; date: string; substituteTeacherId: number; reason: string | null }): Observable<SubLesson> {
    return this.http.put<SubLesson>(`${this.base}/substitutions`, request);
  }

  deleteSubstitution(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/substitutions/${id}`);
  }
}
