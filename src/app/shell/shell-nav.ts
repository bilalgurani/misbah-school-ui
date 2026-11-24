// The side menu and the phone tab bar are built from this list, so adding a page means adding one line here.
// Keep labels short and in everyday words. Pages that are a variation of another (add / edit / whole-class print)
// are reached from that page's own buttons and listed in `match`, so the menu stays short.

export type NavRole = 'ADMIN' | 'TEACHER';

export interface NavLinkItem {
  label: string;
  path: string;
  /** Only this role sees it; everyone signed in sees it when empty. */
  role?: NavRole;
  /** Other pages that belong to this entry, so it stays highlighted on them. */
  match?: string[];
}

export interface NavTopLink extends NavLinkItem {
  icon: string;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: NavLinkItem[];
}

const ICON = {
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  calendar: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z',
  attendance: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  students: 'M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z',
  staff: 'M4 13h6c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1zm0 8h6c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1zm10 0h6c.55 0 1-.45 1-1v-8c0-.55-.45-1-1-1h-6c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1zM13 4v4c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1h-6c-.55 0-1 .45-1 1z',
  report: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
  marks: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  card: 'M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z',
  settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  admin: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
  menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
} as const;

export { ICON as NAV_ICONS };

/** Single links above the groups. */
export const NAV_TOP_LINKS: NavTopLink[] = [
  { label: 'Home', path: '/dashboard', icon: ICON.home },
  { label: 'My Leave', path: '/leave/my', icon: ICON.calendar, role: 'TEACHER' },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'attendance',
    label: 'Attendance',
    icon: ICON.attendance,
    items: [
      { label: 'Take Attendance', path: '/student-attendance' },
      { label: "Teachers' Attendance", path: '/teacher-attendance', role: 'ADMIN' },
      { label: 'Daily Report', path: '/reports/attendance', role: 'ADMIN' },
      { label: 'Monthly Register', path: '/reports/attendance/monthly' },
      { label: 'Student History', path: '/reports/attendance/student' },
      { label: 'Holidays', path: '/calendar/holidays' },
    ],
  },
  {
    id: 'timetable',
    label: 'Timetable',
    icon: ICON.calendar,
    items: [
      { label: 'Timetable', path: '/timetable' },
      { label: 'Cover for Absent Teachers', path: '/timetable/substitutions', role: 'ADMIN' },
      { label: 'Timetable Setup', path: '/timetable/setup', role: 'ADMIN' },
    ],
  },
  {
    id: 'students',
    label: 'Students',
    icon: ICON.students,
    items: [
      { label: 'All Students', path: '/students', match: ['/students/add', '/students/edit', '/students/import'] },
      { label: 'Change Class', path: '/students/move' },
      { label: 'Left School', path: '/students/exit-history', role: 'ADMIN' },
      { label: 'Promote to Next Year', path: '/promote-students', role: 'ADMIN' },
    ],
  },
  {
    id: 'staff',
    label: 'Teachers & Leave',
    icon: ICON.staff,
    items: [
      { label: 'All Teachers', path: '/teachers', role: 'ADMIN', match: ['/teachers/add', '/teachers/add-many', '/teachers/edit'] },
      { label: 'Leave Requests', path: '/leave/requests', role: 'ADMIN' },
    ],
  },
  {
    id: 'marks',
    label: 'Marks & Report Cards',
    icon: ICON.report,
    items: [
      { label: 'Enter Marks', path: '/exams/marks' },
      { label: 'Class Results', path: '/exams/results' },
      { label: 'Skills & Remarks', path: '/progress/assess' },
      { label: 'Report Card', path: '/exams/report-card' },
      { label: 'Progress Card', path: '/progress/card', match: ['/progress/cards'] },
    ],
  },
  {
    id: 'fees',
    label: 'Fees & Accounts',
    icon: ICON.card,
    items: [
      { label: 'Collect Fee', path: '/fees/collect', role: 'ADMIN', match: ['/fees/receipt'] },
      { label: 'Pending Fees', path: '/fees/dues', role: 'ADMIN' },
      { label: 'Income & Expenses', path: '/financials', role: 'ADMIN' },
    ],
  },
  {
    id: 'setup',
    label: 'Setup',
    icon: ICON.settings,
    items: [
      { label: 'Classes & Sections', path: '/classes', role: 'ADMIN' },
      { label: 'Academic Years', path: '/academic-years', role: 'ADMIN' },
      { label: 'Exams & Subjects', path: '/exams/setup', role: 'ADMIN' },
      { label: 'Fee Structure', path: '/fees/setup', role: 'ADMIN' },
      { label: 'Skills to Rate', path: '/progress/criteria', role: 'ADMIN' },
      { label: 'Leave Types', path: '/leave/settings', role: 'ADMIN' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: ICON.admin,
    items: [
      { label: 'Activity Log', path: '/admin/audit-log', role: 'ADMIN' },
      { label: 'Backup', path: '/admin/backup', role: 'ADMIN' },
    ],
  },
];

export interface BottomTab {
  label: string;
  path: string;
  icon: string;
  role?: NavRole;
  /** Path prefixes that keep this tab highlighted. */
  within: string[];
}

/** The tabs along the bottom of a phone: the few things used all day, then "Menu" for everything else. */
export const BOTTOM_TABS: BottomTab[] = [
  { label: 'Home', path: '/dashboard', icon: ICON.home, within: ['/dashboard'] },
  { label: 'Attendance', path: '/student-attendance', icon: ICON.attendance, within: ['/student-attendance', '/teacher-attendance', '/reports/attendance', '/calendar'] },
  { label: 'Students', path: '/students', icon: ICON.students, within: ['/students', '/promote-students'] },
  { label: 'Marks', path: '/exams/marks', icon: ICON.marks, role: 'TEACHER', within: ['/exams', '/progress'] },
  { label: 'Fees', path: '/fees/collect', icon: ICON.card, role: 'ADMIN', within: ['/fees', '/financials'] },
];
