// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { StudentAttendance } from './attendance/components/student-attendance/student-attendance';
import { TeacherAttendance } from './attendance/components/teacher-attendance/teacher-attendance';
import { AddStudent } from './students/components/add-student/add-student';
import { AddTeacher } from './teachers/components/add-teacher/add-teacher';
import { StudentDirectory } from './students/components/student-directory/student-directory';
import { TeacherDirectory } from './teachers/components/teacher-directory/teacher-directory';
import { Dashboard } from './dashboard/dashboard';
import { Login } from './auth/login/login';
import { ChangePassword } from './auth/change-password/change-password';
import { AuthGuards } from './auth/auth.guard';
import { Shell } from './shell/shell';
import { Register } from './auth/register/register';
import { UserManagement } from './user-management/user-management';
import { AcademicYears } from './academics/components/academic-years/academic-years';
import { PromoteStudents } from './academics/components/promote-students/promote-students';
import { StudentHistoryTab } from './academics/components/student-history-tab/student-history-tab';
import { ExitRecords } from './academics/components/exit-records/exit-records';
import { ClassManagement } from './classes/components/class-management/class-management';
import { AttendanceReportComponent } from './reports/components/attendance-report/attendance-report';

export const routes: Routes = [
  // Public Route
  { 
    path: 'login', 
    component: Login, 
    canActivate: [AuthGuards.redirectIfAuthenticatedGuard] 
  },

  {
    path: '',
    component: Shell,
    canActivate: [AuthGuards.authGuard],   // guard runs once, on the parent
    canActivateChild: [AuthGuards.passwordChangeGuard],
    children: [
      {path: 'register', component: Register, canActivate: [AuthGuards.roleGuard('ADMIN')]},
      { path: 'change-password', component: ChangePassword },
      { path: 'profile', loadComponent: () => import('./profile/profile').then(m => m.Profile) },
      { path: 'help', loadComponent: () => import('./help/help').then(m => m.Help) },
      { path: 'dashboard', component: Dashboard },
      { path: 'reset-password', component: UserManagement, canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'admin', component: Dashboard, canActivate: [AuthGuards.roleGuard('ADMIN')] },

      // Academic Management Routes
      { path: 'classes', component: ClassManagement, canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'academic-years', component: AcademicYears, canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'promote-students', component: PromoteStudents, canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'students/history', component: StudentHistoryTab, canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'students/:studentId/history', component: StudentHistoryTab, canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'students/exit-history', component: ExitRecords, canActivate: [AuthGuards.roleGuard('ADMIN')] },
      

      { path: 'students', component: StudentDirectory },
      { path: 'student-attendance', component: StudentAttendance },
      { path: 'students/add', component: AddStudent, canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'students/edit/:id', component: AddStudent, canActivate: [AuthGuards.roleGuard('ADMIN')] },

      { path: 'teachers', component: TeacherDirectory, canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'teacher-attendance', component: TeacherAttendance, canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'teachers/add', component: AddTeacher, canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'teachers/edit/:id', component: AddTeacher, canActivate: [AuthGuards.roleGuard('ADMIN')] },

      { path: 'financials', loadComponent: () => import('./financial/financial-ledger/financial-ledger').then(m => m.FinancialLedger), canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'reports/attendance', component: AttendanceReportComponent, canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'reports/attendance/monthly', loadComponent: () => import('./reports/components/monthly-attendance-report/monthly-attendance-report').then(m => m.MonthlyAttendanceReport) },
      { path: 'reports/attendance/student', loadComponent: () => import('./reports/components/student-attendance-report/student-attendance-report').then(m => m.StudentAttendanceReport) },

      { path: 'calendar/holidays', loadComponent: () => import('./calendar/holidays/holidays').then(m => m.Holidays) },
      { path: 'admin/audit-log', loadComponent: () => import('./admin-tools/audit-log/audit-log').then(m => m.AuditLog), canActivate: [AuthGuards.roleGuard('ADMIN')] },

      { path: 'students/import', loadComponent: () => import('./students/components/student-import/student-import').then(m => m.StudentImport), canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'fees/setup', loadComponent: () => import('./fees/fee-setup/fee-setup').then(m => m.FeeSetup), canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'fees/collect', loadComponent: () => import('./fees/fee-collection/fee-collection').then(m => m.FeeCollection), canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'fees/receipt/:id', loadComponent: () => import('./fees/fee-receipt/fee-receipt').then(m => m.FeeReceipt), canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'fees/dues', loadComponent: () => import('./fees/fee-dues/fee-dues').then(m => m.FeeDues), canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'messages', loadComponent: () => import('./messaging/message-log/message-log').then(m => m.MessageLog), canActivate: [AuthGuards.roleGuard('ADMIN')] },

      { path: 'admin/backup', loadComponent: () => import('./admin-tools/backup/backup').then(m => m.DatabaseBackup), canActivate: [AuthGuards.roleGuard('ADMIN')] },

      { path: 'leave/my', loadComponent: () => import('./leave/my-leave/my-leave').then(m => m.MyLeave) },
      { path: 'leave/requests', loadComponent: () => import('./leave/leave-approvals/leave-approvals').then(m => m.LeaveApprovals), canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'leave/settings', loadComponent: () => import('./leave/leave-settings/leave-settings').then(m => m.LeaveSettings), canActivate: [AuthGuards.roleGuard('ADMIN')] },

      { path: 'exams/setup', loadComponent: () => import('./exams/exam-setup/exam-setup').then(m => m.ExamSetup), canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'exams/marks', loadComponent: () => import('./exams/marks-entry/marks-entry').then(m => m.MarksEntry) },
      { path: 'exams/results', loadComponent: () => import('./exams/exam-results/exam-results').then(m => m.ExamResults) },
      { path: 'exams/report-card', loadComponent: () => import('./exams/report-card/report-card').then(m => m.ReportCard) },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' }
    ]
  },

  { path: '**', redirectTo: 'login' } 
];