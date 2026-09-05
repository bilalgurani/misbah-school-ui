import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LoaderComponent } from '../shared/component/loader.component';
import { DashboardStats } from './models/dashboard.models';
import { DashboardService } from './services/dashboard-api.service';
import { ToastService } from '../shared/services/toast.service';
import { DashboardCharts } from './components/dashboard-charts/dashboard-charts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [LoaderComponent, RouterLink, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  // Signals State Management
  stats = signal<DashboardStats | null>(null);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);
  isPendingModalOpen = signal<boolean>(false);

  private dashboardService = inject(DashboardService);
  private toast = inject(ToastService);

  ngOnInit(): void {
    this.fetchDashboardStats();
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
        this.toast.show('Failed to load dashboard statistics. Please try again.');
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
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