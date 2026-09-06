// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { StudentAttendance } from './attendance/components/student-attendance/student-attendance';
import { TeacherAttendance } from './attendance/components/teacher-attendance/teacher-attendance';
import { AddStudent } from './students/components/add-student/add-student';
import { AddTeacher } from './teachers/components/add-teacher/add-teacher';
import { StudentDirectory } from './students/components/student-directory/student-directory';
import { TeacherDirectory } from './teachers/components/teacher-directory/teacher-directory';
import { Dashboard } from './dashboard/dashboard';
import { FinancialLedger } from './financial/financial-ledger/financial-ledger';
import { Login } from './auth/login/login';
import { ChangePassword } from './auth/change-password/change-password';
import { AuthGuards } from './auth/auth.guard';
import { Shell } from './shell/shell';
import { Register } from './auth/register/register';

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
    children: [
      {path: 'register', component: Register, canActivate: [AuthGuards.roleGuard('ADMIN')]},
      { path: 'change-password', component: ChangePassword },
      { path: 'dashboard', component: Dashboard },
      { path: 'admin', component: Dashboard, canActivate: [AuthGuards.roleGuard('ADMIN')] },

      { path: 'students', component: StudentDirectory },
      { path: 'student-attendance', component: StudentAttendance },
      { path: 'students/add', component: AddStudent, canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'students/edit/:id', component: AddStudent, canActivate: [AuthGuards.roleGuard('ADMIN')] },

      { path: 'teachers', component: TeacherDirectory, canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'teacher-attendance', component: TeacherAttendance },
      { path: 'teachers/add', component: AddTeacher, canActivate: [AuthGuards.roleGuard('ADMIN')] },
      { path: 'teachers/edit/:id', component: AddTeacher, canActivate: [AuthGuards.roleGuard('ADMIN')] },

      { path: 'financials', component: FinancialLedger, canActivate: [AuthGuards.roleGuard('ADMIN')] },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' }
    ]
  },

  { path: '**', redirectTo: 'login' } 
];