import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, from, map, mergeMap, of, toArray } from 'rxjs';
import { AttendanceRegisterService, MonthlyAttendanceResponse } from '../../reports/services/attendance-register.service';
import { StudentAttendanceStat, buildStat, previousMonthKey, toMonthKey } from '../attendance-trend.util';

const MAX_PARALLEL_SECTIONS = 4;

export type StudentStatMap = Map<number, StudentAttendanceStat>;

/** Per-student attendance % for a month and the change from the month before, using the monthly register. */
@Injectable({ providedIn: 'root' })
export class AttendanceTrendService {
  private register = inject(AttendanceRegisterService);

  getSectionStats(classSectionId: number, date: string | Date): Observable<StudentStatMap> {
    const month = toMonthKey(date);
    return forkJoin({
      current: this.loadMonth(month, classSectionId),
      previous: this.loadMonth(previousMonthKey(month), classSectionId),
    }).pipe(
      map(({ current, previous }) => {
        const currentPct = new Map(current?.students.map(s => [s.studentId, s.attendancePct]));
        const previousPct = new Map(previous?.students.map(s => [s.studentId, s.attendancePct]));
        const ids = new Set([...currentPct.keys(), ...previousPct.keys()]);
        return new Map([...ids].map(id => [id, buildStat(currentPct.get(id), previousPct.get(id))] as const));
      }),
    );
  }

  getManySectionStats(classSectionIds: number[], date: string | Date): Observable<StudentStatMap> {
    if (classSectionIds.length === 0) return of(new Map());
    return from(classSectionIds).pipe(
      mergeMap(id => this.getSectionStats(id, date), MAX_PARALLEL_SECTIONS),
      toArray(),
      map(parts => new Map(parts.flatMap(part => [...part]))),
    );
  }

  // A failed or missing month just means "no data"; the rest of the screen should still work.
  private loadMonth(month: string, classSectionId: number): Observable<MonthlyAttendanceResponse | null> {
    return this.register.getMonthly(month, classSectionId).pipe(catchError(() => of(null)));
  }
}
