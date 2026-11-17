import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AttendanceTrend } from '../../models/dashboard.models';
import { DashboardService } from '../../services/dashboard-api.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  imports: [DecimalPipe],
  selector: 'app-dashboard-charts',
  styleUrl: './dashboard-charts.scss',
  templateUrl: './dashboard-charts.html',
})
export class DashboardCharts implements OnInit {
  private dashboardService = inject(DashboardService);
  private toast = inject(ToastService);

  private raw = signal<AttendanceTrend[]>([]);
  isLoading = signal<boolean>(true);

  trends = computed(() =>
    this.raw().map(t => ({ ...t, label: this.formatPeriod(t.period) }))
  );

  hasAnyData = computed(() =>
    this.raw().some(t => t.studentAttendancePercentage !== null || t.teacherAttendancePercentage !== null)
  );

  ngOnInit(): void {
    this.dashboardService.getAttendanceTrend(6).subscribe({
      next: (data) => {
        this.raw.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.showError(err, 'Failed to load the attendance trend.');
      }
    });
  }

  // period arrives as "YYYY-MM"
  private formatPeriod(period: string): string {
    const [year, month] = period.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  }
}
