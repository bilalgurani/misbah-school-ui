import { buildAttendanceReport } from './attendance-report.builder';
import { SectionAttendanceData } from '../models/attendance-report.model';

const section = (id: number, name: string): SectionAttendanceData['section'] => ({
  id,
  levelName: name,
  division: 'A',
  displayName: name,
});

describe('buildAttendanceReport', () => {
  const sections: SectionAttendanceData[] = [
    {
      section: section(1, 'Class 1-A'),
      failed: false,
      roster: [
        { id: 1, name: 'Aman', rollNo: 1, gender: 'M' },
        { id: 2, name: 'Sara', rollNo: 2, gender: 'F' },
        { id: 3, name: 'Zoya', rollNo: 10, gender: 'F' },
        { id: 4, name: 'Ali', rollNo: 3, gender: 'M' },
      ],
      records: [
        { studentId: 1, studentName: 'Aman', rollNo: 1, status: 'PRESENT' },
        { studentId: 2, studentName: 'Sara', rollNo: 2, status: 'ABSENT' },
        { studentId: 3, studentName: 'Zoya', rollNo: 10, status: 'ABSENT' },
        { studentId: 4, studentName: 'Ali', rollNo: 3, status: 'LATE' },
      ],
    },
    {
      section: section(2, 'Class 2-A'),
      failed: false,
      roster: [{ id: 5, name: 'Noor', rollNo: 1, gender: 'F' }],
      records: [],
    },
  ];

  it('aggregates marked classes only and treats late as attended', () => {
    const r = buildAttendanceReport('2026-11-14', sections, [], 0);

    expect(r.markedSections).toBe(1);
    expect(r.pendingSections.map(c => c.displayName)).toEqual(['Class 2-A']);
    expect(r.totalEnrolled).toBe(5);
    expect([r.present, r.late, r.absent]).toEqual([1, 1, 2]);
    expect(r.attendancePct).toBe(50);
    expect(r.lowAttendanceClasses.length).toBe(1);
  });

  it('splits attendance by gender and lists absentees in roll order', () => {
    const r = buildAttendanceReport('2026-11-14', sections, [], 0);

    expect(r.genders[0]).toMatchObject({ label: 'Boys', total: 2, attended: 2, attendancePct: 100 });
    expect(r.genders[1]).toMatchObject({ label: 'Girls', total: 2, attended: 0, attendancePct: 0 });
    expect(r.absentees.map(a => `${a.name}:${a.status}`)).toEqual(['Sara:ABSENT', 'Zoya:ABSENT', 'Ali:LATE']);
  });

  it('reports staff attendance and unmarked/unavailable states', () => {
    const records = [
      { teacherId: 1, teacherName: 'T1', employeeId: 'E1', status: 'PRESENT' },
      { teacherId: 2, teacherName: 'T2', employeeId: 'E2', status: 'ABSENT' },
    ];
    const marked = buildAttendanceReport('2026-11-14', [], records, 3).staff;
    expect(marked).toMatchObject({ totalTeachers: 3, present: 1, absent: 1, attendancePct: 50 });
    expect(marked.absentees.map(t => t.name)).toEqual(['T2']);

    expect(buildAttendanceReport('d', [], [], 3).staff.marked).toBe(false);
    expect(buildAttendanceReport('d', [], null, 3).staff.available).toBe(false);
  });

  it('keeps failed sections out of the figures', () => {
    const r = buildAttendanceReport('d', [{ ...sections[0], failed: true }], [], 0);
    expect(r.markedSections).toBe(0);
    expect(r.failedSections.length).toBe(1);
    expect(r.attendancePct).toBeNull();
  });
});
