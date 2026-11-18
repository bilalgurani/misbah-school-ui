import { Component, computed, input } from '@angular/core';
import type { ChartConfiguration } from 'chart.js';
import { CHART_COLORS, CHART_PALETTE } from '../../shared/component/chart.component';
import { ChartCardComponent, INR_TICKS } from '../../shared/component/chart-card.component';
import { formatInr } from '../../fees/utils/inr.pipe';
import { MonthTotal } from '../ledger.service';

export interface LedgerChartSlice {
  label: string;
  total: number;
}

function monthLabel(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  return new Date(year, (mon || 1) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

@Component({
  selector: 'app-ledger-charts',
  imports: [ChartCardComponent],
  templateUrl: './ledger-charts.html',
  styleUrl: './ledger-charts.scss',
})
export class LedgerCharts {
  monthly = input.required<MonthTotal[]>();
  expenses = input.required<LedgerChartSlice[]>();

  monthlyData = computed<ChartConfiguration['data']>(() => {
    const rows = this.monthly();
    return {
      labels: rows.map(m => monthLabel(m.month)),
      datasets: [
        { type: 'bar', label: 'Income', data: rows.map(m => m.income), backgroundColor: CHART_COLORS.green, borderRadius: 4, order: 2 },
        { type: 'bar', label: 'Expense', data: rows.map(m => m.expense), backgroundColor: CHART_COLORS.red, borderRadius: 4, order: 2 },
        {
          type: 'line', label: 'Net', data: rows.map(m => m.net), borderColor: CHART_COLORS.blue,
          backgroundColor: CHART_COLORS.blue, borderWidth: 2, pointRadius: 3, tension: 0.25, order: 1,
        },
      ],
    };
  });

  monthlyOptions: ChartConfiguration['options'] = {
    locale: 'en-IN',
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { ticks: INR_TICKS } },
  };

  expenseData = computed<ChartConfiguration['data']>(() => {
    const rows = this.expenses();
    return {
      labels: rows.map(r => `${r.label} · ${formatInr(r.total)}`),
      datasets: [{
        data: rows.map(r => r.total),
        backgroundColor: rows.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
        borderWidth: 1,
      }],
    };
  });

  expenseOptions: ChartConfiguration['options'] = {
    locale: 'en-IN',
    plugins: { legend: { position: 'bottom' }, tooltip: { enabled: false } },
  };
}
