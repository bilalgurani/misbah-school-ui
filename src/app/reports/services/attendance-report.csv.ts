import { AttendanceReport } from '../models/attendance-report.model';

const cell = (value: string | number | null | undefined): string => {
  const text = value === null || value === undefined ? '' : String(value);
  // Prefix formula-like values so spreadsheets don't execute them.
  const safe = /^[=+\-@]/.test(text) && Number.isNaN(Number(text)) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const line = (...values: (string | number | null | undefined)[]): string => values.map(cell).join(',');

const fixed = (value: number | null): string => (value === null ? 'N/A' : value.toFixed(1));

export function attendanceReportToCsv(r: AttendanceReport): string {
  const rows: string[] = [
    line('Sana Misbah School - Daily Attendance Report'),
    line('Date', r.date),
    line('Generated at', r.generatedAt.toLocaleString()),
    '',
    line('SUMMARY'),
    line('Class sections marked', `${r.markedSections} of ${r.totalSections}`),
    line('Students on roll', r.totalEnrolled),
    line('Students marked', r.markedStudents),
    line('Present', r.present),
    line('Late', r.late),
    line('Absent', r.absent),
    line('Attendance %', fixed(r.attendancePct)),
    '',
    line('GENDER-WISE'),
    line('Gender', 'Marked', 'Attended', 'Absent', 'Attendance %'),
    ...r.genders.map(g => line(g.label, g.total, g.attended, g.absent, fixed(g.attendancePct))),
    '',
    line('CLASS-WISE'),
    line('Class', 'Status', 'On roll', 'Present', 'Late', 'Absent', 'Attendance %'),
    ...r.classRows.map(c =>
      line(
        c.displayName,
        c.failed ? 'Failed to load' : c.marked ? 'Marked' : 'Pending',
        c.enrolled,
        c.present,
        c.late,
        c.absent,
        fixed(c.attendancePct),
      ),
    ),
    '',
    line('ABSENT / LATE STUDENTS'),
    line('Class', 'Roll No', 'Name', 'Status'),
    ...r.absentees.map(a => line(a.className, a.rollNo, a.name, a.status)),
    '',
    line('TEACHING STAFF'),
    line('Total teachers', r.staff.totalTeachers),
    line('Present', r.staff.present),
    line('Late', r.staff.late),
    line('Absent', r.staff.absent),
    line('Attendance %', fixed(r.staff.attendancePct)),
    line('Employee ID', 'Name', 'Status'),
    ...r.staff.absentees.map(t => line(t.employeeId, t.name, t.status)),
  ];
  return rows.join('\r\n');
}
