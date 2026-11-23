import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoaderComponent } from '../shared/component/loader.component';
import { DashboardStats } from './models/dashboard.models';
import { DashboardService } from './services/dashboard-api.service';
import { DashboardCharts } from './components/dashboard-charts/dashboard-charts';
import { ToastService } from '../shared/services/toast.service';
import { AuthService } from '../auth/auth.service';
import { SchoolConfigService } from '../school/school-config.service';
import { CalendarService, WorkingDaysSummary } from '../calendar/holidays/calendar.service';

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [LoaderComponent, RouterLink, DecimalPipe, DatePipe, DashboardCharts],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  // Signals State Management
  stats = signal<DashboardStats | null>(null);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);
  isPendingModalOpen = signal<boolean>(false);
  // Optional extra: if it can't be loaded the dashboard simply shows no strip.
  yearSummary = signal<WorkingDaysSummary | null>(null);

  private dashboardService = inject(DashboardService);
  private calendarService = inject(CalendarService);
  private toast = inject(ToastService);
  protected auth = inject(AuthService);
  protected school = inject(SchoolConfigService);

  protected readonly isMockDashboard = inject(ActivatedRoute).snapshot.data['mockDashboard'] === true;
  protected readonly greeting = greetingFor(new Date().getHours());

  ngOnInit(): void {
    this.fetchDashboardStats();
    this.calendarService.getSummary().subscribe({
      next: summary => this.yearSummary.set(summary),
      error: () => this.yearSummary.set(null),
    });
  }

  fetchDashboardStats(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.dashboardService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.show('Failed to load dashboard statistics. Please try again.', 'error');
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  // Share of the school year's working days that have passed, kept within 0-100 for the progress bar.
  protected yearProgress(y: WorkingDaysSummary): number {
    if (y.workingDaysTotal <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((y.workingDaysElapsed / y.workingDaysTotal) * 100)));
  }

  openPendingModal(): void {
    const currentStats = this.stats();
    if (currentStats?.pendingClasses && currentStats.pendingClasses.length > 0) {
      this.isPendingModalOpen.set(true);
    }
  }

  closePendingModal(): void {
    this.isPendingModalOpen.set(false);
  }
}