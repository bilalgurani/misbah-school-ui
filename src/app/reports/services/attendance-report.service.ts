import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, from, map, mergeMap, of, switchMap, throwError, toArray } from 'rxjs';
import { AttendanceApiService } from '../../attendance/services/attendance-api.service';
import { ClassSection } from '../../attendance/models/attendance.models';
import { AttendanceReport, SectionAttendanceData } from '../models/attendance-report.model';
import { buildAttendanceReport } from './attendance-report.builder';

const MAX_PARALLEL_SECTION_REQUESTS = 5;

@Injectable({ providedIn: 'root' })
export class AttendanceReportService {
  private api = inject(AttendanceApiService);

  getDailyReport(date: string): Observable<AttendanceReport> {
    return this.api.getClassSections().pipe(
      switchMap(sections =>
        forkJoin({
          sections: this.loadSections(sections, date),
          teacherRecords: this.api.getTeacherAttendance(date).pipe(catchError(() => of(null))),
          teachers: this.api.getAllTeachers().pipe(catchError(() => of([]))),
        }),
      ),
      map(({ sections, teacherRecords, teachers }) =>
        buildAttendanceReport(date, sections, teacherRecords, teachers.length),
      ),
    );
  }

  private loadSections(sections: ClassSection[], date: string): Observable<SectionAttendanceData[]> {
    if (sections.length === 0) return of([]);

    return from(sections).pipe(
      mergeMap(
        section =>
          forkJoin({
            roster: this.api.getStudentsBySection(section.id),
            // The attendance endpoint may answer 404 for an unmarked day; that is "pending", not a failure.
            records: this.api.getAttendance(section.id, date).pipe(
              catchError((err: HttpErrorResponse) => (err.status === 404 ? of([]) : throwError(() => err))),
            ),
          }).pipe(
            map(({ roster, records }): SectionAttendanceData => ({ section, roster, records, failed: false })),
            catchError(() => of<SectionAttendanceData>({ section, roster: [], records: [], failed: true })),
          ),
        MAX_PARALLEL_SECTION_REQUESTS,
      ),
      toArray(),
      // mergeMap finishes out of order; restore the class-section ordering.
      map(results => sections.map(s => results.find(r => r.section.id === s.id)!)),
    );
  }
}
