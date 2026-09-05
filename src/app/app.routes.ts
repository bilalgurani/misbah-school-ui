import { Routes } from '@angular/router';
import { StudentAttendance } from './attendance/components/student-attendance/student-attendance';
import { TeacherAttendance } from './attendance/components/teacher-attendance/teacher-attendance';
import { AddStudent } from './students/components/add-student/add-student';
import { AddTeacher } from './teachers/components/add-teacher/add-teacher';
import { StudentDirectory } from './students/components/student-directory/student-directory';
import { TeacherDirectory } from './teachers/components/teacher-directory/teacher-directory';
import { Dashboard } from './dashboard/dashboard';

export const routes: Routes = [
    {path: '', redirectTo: '/dashboard', pathMatch: 'full'},
    {path: 'dashboard', component: Dashboard},
    // --- STUDENTS SECTION ---
    {path: 'students', component: StudentDirectory},
    {path: 'student-attendance', component: StudentAttendance},
    {path: 'students/add', component: AddStudent},
    {path: 'students/edit/:id', component: AddStudent},

    // --- TEACHERS SECTION ---
    {path: 'teachers', component: TeacherDirectory},
    {path: 'teacher-attendance', component: TeacherAttendance},
    {path: 'teachers/add', component: AddTeacher},
    { path: 'teachers/edit/:id', component: AddTeacher },
    

    // Fallback route for unknown URLs
    { 
    path: '**', 
    redirectTo: 'dashboard' 
  }
];
