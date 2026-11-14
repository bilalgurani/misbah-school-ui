import { TeacherAttendanceRecordDto } from '../../attendance/models/attendance.models';
import {
  AbsenteeRow,
  AttendanceReport,
  ClassReportRow,
  GenderReportRow,
  SectionAttendanceData,
  StaffReport,
} from '../models/attendance-report.model';

// Classes whose attendance falls below this percentage are flagged for management attention.
export const LOW_ATTENDANCE_THRESHOLD = 80;

const pct = (part: number, whole: number): number | null =>
  whole > 0 ? (part / whole) * 100 : null;

const normalize = (status: string | undefined | null): string => (status ?? '').toUpperCase();

const rollSort = (a: string | number, b: string | number): number =>
  String(a).localeCompare(String(b), undefined, { numeric: true });

export function buildAttendanceReport(
  date: string,
  sections: SectionAttendanceData[],
  teacherRecords: TeacherAttendanceRecordDto[] | null,
  totalTeachers: number,
): AttendanceReport {
  const genderByStudent = new Map<number, string>();
  sections.forEach(s => s.roster.forEach(st => genderByStudent.set(st.id, normalize(st.gender))));

  const genderTotals = {
    M: { total: 0, attended: 0 },
    F: { total: 0, attended: 0 },
  };
  const absentees: AbsenteeRow[] = [];
  const classRows: ClassReportRow[] = [];

  for (const { section, roster, records, failed } of sections) {
    const marked = !failed && records.length > 0;
    let present = 0;
    let late = 0;
    let absent = 0;

    if (marked) {
      for (const r of records) {
        const status = normalize(r.status);
        const attended = status === 'PRESENT' || status === 'LATE';
        if (status === 'PRESENT') present++;
        else if (status === 'LATE') late++;
        else absent++;

        const gender = genderByStudent.get(r.studentId);
        if (gender === 'M' || gender === 'F') {
          genderTotals[gender].total++;
          if (attended) genderTotals[gender].attended++;
        }

        if (!attended || status === 'LATE') {
          absentees.push({
            studentId: r.studentId,
            name: r.studentName,
            rollNo: r.rollNo,
            className: section.displayName,
            status: status === 'LATE' ? 'LATE' : 'ABSENT',
          });
        }
      }
    }

    classRows.push({
      classSectionId: section.id,
      displayName: section.displayName,
      marked,
      failed,
      enrolled: marked ? records.length : roster.length,
      present,
      late,
      absent,
      attendancePct: marked ? pct(present + late, records.length) : null,
    });
  }

  // Keep absentees grouped by class (in class order), then by roll number; absent before late.
  const classOrder = new Map(classRows.map((c, i) => [c.displayName, i]));
  absentees.sort(
    (a, b) =>
      (classOrder.get(a.className) ?? 0) - (classOrder.get(b.className) ?? 0) ||
      (a.status === b.status ? 0 : a.status === 'ABSENT' ? -1 : 1) ||
      rollSort(a.rollNo, b.rollNo),
  );

  const markedRows = classRows.filter(c => c.marked);
  const present = markedRows.reduce((n, c) => n + c.present, 0);
  const late = markedRows.reduce((n, c) => n + c.late, 0);
  const absent = markedRows.reduce((n, c) => n + c.absent, 0);
  const markedStudents = present + late + absent;

  const ranked = [...markedRows].sort((a, b) => (b.attendancePct ?? 0) - (a.attendancePct ?? 0));

  const toGenderRow = (label: string, t: { total: number; attended: number }): GenderReportRow => ({
    label,
    total: t.total,
    attended: t.attended,
    absent: t.total - t.attended,
    attendancePct: pct(t.attended, t.total),
  });

  return {
    date,
    generatedAt: new Date(),
    totalSections: classRows.length,
    markedSections: markedRows.length,
    pendingSections: classRows.filter(c => !c.marked && !c.failed),
    failedSections: classRows.filter(c => c.failed),
    totalEnrolled: classRows.reduce((n, c) => n + c.enrolled, 0),
    markedStudents,
    present,
    late,
    absent,
    attendancePct: pct(present + late, markedStudents),
    genders: [toGenderRow('Boys', genderTotals.M), toGenderRow('Girls', genderTotals.F)],
    classRows,
    bestClass: ranked[0] ?? null,
    lowestClass: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    lowAttendanceClasses: ranked
      .filter(c => (c.attendancePct ?? 100) < LOW_ATTENDANCE_THRESHOLD)
      .reverse(),
    absentees,
    staff: buildStaffReport(teacherRecords, totalTeachers),
  };
}

function buildStaffReport(
  records: TeacherAttendanceRecordDto[] | null,
  totalTeachers: number,
): StaffReport {
  if (records === null) {
    return { available: false, totalTeachers, marked: false, present: 0, late: 0, absent: 0, attendancePct: null, absentees: [] };
  }

  const present = records.filter(r => normalize(r.status) === 'PRESENT').length;
  const late = records.filter(r => normalize(r.status) === 'LATE').length;
  const absent = records.length - present - late;

  return {
    available: true,
    totalTeachers: Math.max(totalTeachers, records.length),
    marked: records.length > 0,
    present,
    late,
    absent,
    attendancePct: pct(present + late, records.length),
    absentees: records
      .filter(r => normalize(r.status) !== 'PRESENT')
      .map(r => ({
        teacherId: r.teacherId,
        name: r.teacherName,
        employeeId: r.employeeId,
        status: normalize(r.status) === 'LATE' ? 'LATE' : 'ABSENT',
      })),
  };
}
