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
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { AuthGuards } from './auth/auth.guard';

export const routes: Routes = [
  // Public Route
  { 
    path: 'login', 
    component: Login, 
    canActivate: [AuthGuards.redirectIfAuthenticatedGuard] 
  },
  
  // Protected Common Routes
  { path: 'change-password', component: ChangePassword, canActivate: [AuthGuards.authGuard] },
  { path: 'dashboard', component: Dashboard, canActivate: [AuthGuards.authGuard] },

  // Admin Workspace
  { 
    path: 'admin', 
    component: AdminDashboard, 
    canActivate: [AuthGuards.roleGuard('ADMIN')] // FIXED: Replaced redirect guard with roleGuard
  },

  // --- STUDENTS SECTION ---
  { path: 'students', component: StudentDirectory, canActivate: [AuthGuards.authGuard] },
  { path: 'student-attendance', component: StudentAttendance, canActivate: [AuthGuards.authGuard] },
  { path: 'students/add', component: AddStudent, canActivate: [AuthGuards.roleGuard('ADMIN')] },
  { path: 'students/edit/:id', component: AddStudent, canActivate: [AuthGuards.roleGuard('ADMIN')] },

  // --- TEACHERS SECTION ---
  { path: 'teachers', component: TeacherDirectory, canActivate: [AuthGuards.roleGuard('ADMIN')] },
  { path: 'teacher-attendance', component: TeacherAttendance, canActivate: [AuthGuards.authGuard] },
  { path: 'teachers/add', component: AddTeacher, canActivate: [AuthGuards.roleGuard('ADMIN')] },
  { path: 'teachers/edit/:id', component: AddTeacher, canActivate: [AuthGuards.roleGuard('ADMIN')] },

  // -- FINANCE SECTION --
  { path: 'financials', component: FinancialLedger, canActivate: [AuthGuards.roleGuard('ADMIN')] },

  // Fallbacks
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];