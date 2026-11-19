import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import type { ChartConfiguration } from 'chart.js';
import { AttendanceTrend, ClassAttendanceDay, DashboardStats } from '../../models/dashboard.models';
import { DashboardService } from '../../services/dashboard-api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LoaderComponent } from '../../../shared/component/loader.component';
import { CHART_COLORS, ChartComponent, GENDER_COLORS } from '../../../shared/component/chart.component';

type ChartOptions = ChartConfiguration['options'];

@Component({
  imports: [LoaderComponent, ChartComponent],
  selector: 'app-dashboard-charts',
  styleUrl: './dashboard-charts.scss',
  templateUrl: './dashboard-charts.html',
})
export class DashboardCharts implements OnInit {
  private dashboardService = inject(DashboardService);
  private toast = inject(ToastService);

  stats = input.required<DashboardStats>();

  private trendRaw = signal<AttendanceTrend[]>([]);
  trendLoading = signal(true);
  today = signal<ClassAttendanceDay | null>(null);
  todayLoading = signal(true);

  trendOptions: ChartOptions = {
    scales: { y: { min: 0, max: 100, ticks: { callback: (value) => `${value}%` } } },
    plugins: { legend: { position: 'bottom' } },
  };

  hasTrendData = computed(() =>
    this.trendRaw().some(t => t.studentAttendancePercentage !== null || t.teacherAttendancePercentage !== null));

  trendData = computed<ChartConfiguration['data']>(() => ({
    labels: this.trendRaw().map(t => this.formatPeriod(t.period)),
    datasets: [
      {
        label: 'Students (%)',
        data: this.trendRaw().map(t => t.studentAttendancePercentage),
        borderColor: CHART_COLORS.blue,
        backgroundColor: CHART_COLORS.blue,
        tension: 0.3,
      },
      {
        label: 'Teachers (%)',
        data: this.trendRaw().map(t => t.teacherAttendancePercentage),
        borderColor: CHART_COLORS.green,
        backgroundColor: CHART_COLORS.green,
        tension: 0.3,
      },
    ],
  }));

  markedClasses = computed(() => (this.today()?.classes ?? []).filter(c => c.marked));
  pendingClasses = computed(() => (this.today()?.classes ?? []).filter(c => !c.marked));

  classOptions: ChartOptions = {
    indexAxis: 'y',
    scales: { x: { min: 0, max: 100, ticks: { callback: (value) => `${value}%` } } },
    plugins: { legend: { display: false } },
  };

  classHeight = computed(() => Math.max(180, this.markedClasses().length * 28 + 40));

  classData = computed<ChartConfiguration['data']>(() => ({
    labels: this.markedClasses().map(c => c.className),
    datasets: [{
      label: 'Present (%)',
      data: this.markedClasses().map(c => c.percentage),
      backgroundColor: this.markedClasses().map(c =>
        (c.percentage ?? 0) >= 90 ? CHART_COLORS.green : (c.percentage ?? 0) >= 75 ? CHART_COLORS.amber : CHART_COLORS.red),
    }],
  }));

  genderData = computed<ChartConfiguration['data']>(() => ({
    labels: ['Boys', 'Girls'],
    datasets: [{ data: [this.stats().totalBoys, this.stats().totalGirls], backgroundColor: [GENDER_COLORS.male, GENDER_COLORS.female] }],
  }));

  levelData = computed<ChartConfiguration['data']>(() => ({
    labels: ['Pre-primary', 'Primary'],
    datasets: [{ data: [this.stats().prePrimaryStudents, this.stats().primaryStudents], backgroundColor: [CHART_COLORS.teal, CHART_COLORS.amber] }],
  }));

  doughnutOptions: ChartOptions = { plugins: { legend: { position: 'bottom' } } };

  ngOnInit(): void {
    this.dashboardService.getAttendanceTrend(6).subscribe({
      next: (data) => {
        this.trendRaw.set(data);
        this.trendLoading.set(false);
      },
      error: (err) => {
        this.trendLoading.set(false);
        this.toast.showError(err, 'Failed to load the attendance trend.');
      }
    });

    this.dashboardService.getClassAttendance().subscribe({
      next: (data) => {
        this.today.set(data);
        this.todayLoading.set(false);
      },
      error: () => this.todayLoading.set(false),
    });
  }

  // period arrives as "YYYY-MM"
  private formatPeriod(period: string): string {
    const [year, month] = period.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  }
}
