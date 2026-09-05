import { DecimalPipe } from '@angular/common';
import { Component, signal } from '@angular/core';

export interface AttendanceTrend {
  period: string;
  studentAttendancePercentage: number;
  teacherAttendancePercentage: number;
}

@Component({
  imports: [DecimalPipe],
  selector: 'app-dashboard-charts',
  styleUrl: './dashboard-charts.scss',
  templateUrl: './dashboard-charts.html',
})
export class DashboardCharts {
  trends = signal<AttendanceTrend[]>([
    { period: 'Jan', studentAttendancePercentage: 88.5, teacherAttendancePercentage: 92.0 },
    { period: 'Feb', studentAttendancePercentage: 85.0, teacherAttendancePercentage: 90.5 },
    { period: 'Mar', studentAttendancePercentage: 91.2, teacherAttendancePercentage: 94.0 },
    { period: 'Apr', studentAttendancePercentage: 87.4, teacherAttendancePercentage: 89.0 },
    { period: 'May', studentAttendancePercentage: 89.8, teacherAttendancePercentage: 93.5 },
    { period: 'Jun', studentAttendancePercentage: 92.5, teacherAttendancePercentage: 95.0 }
  ]);
}
