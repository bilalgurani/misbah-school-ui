import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import type { ChartConfiguration } from 'chart.js';
import { CollectionTrendPoint, FeeDueRow, FeeService } from '../fee.service';
import { CHART_COLORS } from '../../shared/component/chart.component';
import { ChartCardComponent, INR_TICKS } from '../../shared/component/chart-card.component';

const MAX_CLASSES = 12;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  return `${MONTHS[(mon || 1) - 1] ?? month} ${String(year).slice(-2)}`;
}

@Component({
  selector: 'app-fee-dues-charts',
  imports: [ChartCardComponent],
  templateUrl: './fee-dues-charts.html',
  styleUrl: './fee-dues-charts.scss',
})
export class FeeDuesCharts implements OnInit {
  private feeService = inject(FeeService);

  dues = input.required<FeeDueRow[]>();
  loading = input(false);

  trend = signal<CollectionTrendPoint[]>([]);
  trendLoading = signal<boolean>(true);

  trendData = computed<ChartConfiguration['data']>(() => {
    const points = this.trend();
    return {
      labels: points.map(p => monthLabel(p.month)),
      datasets: [{
        label: 'Collected',
        data: points.map(p => p.collected),
        backgroundColor: CHART_COLORS.green,
        borderRadius: 4,
      }],
    };
  });

  trendOptions: ChartConfiguration['options'] = {
    locale: 'en-IN',
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: INR_TICKS } },
  };

  classRows = computed(() => {
    const totals = new Map<string, { balance: number; overdue: number }>();
    for (const d of this.dues()) {
      const row = totals.get(d.className) ?? { balance: 0, overdue: 0 };
      row.balance += d.balance ?? 0;
      row.overdue += d.overdueAmount ?? 0;
      totals.set(d.className, row);
    }
    const rows = [...totals.entries()]
      .map(([className, v]) => ({ className, balance: v.balance, overdue: Math.min(v.overdue, v.balance) }))
      .filter(r => r.balance > 0);
    if (rows.length <= MAX_CLASSES) return rows;
    const keep = new Set([...rows].sort((a, b) => b.balance - a.balance).slice(0, MAX_CLASSES));
    return rows.filter(r => keep.has(r));
  });

  classData = computed<ChartConfiguration['data']>(() => {
    const rows = this.classRows();
    return {
      labels: rows.map(r => r.className),
      datasets: [
        { label: 'Overdue', data: rows.map(r => r.overdue), backgroundColor: CHART_COLORS.red, borderRadius: 4 },
        { label: 'Not yet due', data: rows.map(r => r.balance - r.overdue), backgroundColor: CHART_COLORS.amber, borderRadius: 4 },
      ],
    };
  });

  classOptions: ChartConfiguration['options'] = {
    indexAxis: 'y',
    locale: 'en-IN',
    plugins: { legend: { position: 'bottom' } },
    scales: {
      x: { stacked: true, beginAtZero: true, ticks: INR_TICKS },
      y: { stacked: true },
    },
  };

  classHeight = computed(() => Math.max(240, this.classRows().length * 30 + 90));

  ngOnInit(): void {
    this.feeService.getCollectionTrend().subscribe({
      next: (data) => {
        this.trend.set((data ?? []).filter(p => !!p?.month));
        this.trendLoading.set(false);
      },
      error: () => {
        this.trend.set([]);
        this.trendLoading.set(false);
      },
    });
  }
}
