import { Component, ElementRef, OnDestroy, effect, inject, input, viewChild } from '@angular/core';
import type { Chart, ChartConfiguration, ChartType } from 'chart.js';
import { ThemeService } from '../services/theme.service';

// Colours that read well on the app's light background and stay distinguishable for colour-blind users.
export const CHART_COLORS = {
  blue: '#4f46e5',
  green: '#16a34a',
  amber: '#f59e0b',
  red: '#dc2626',
  teal: '#0d9488',
  purple: '#9333ea',
  pink: '#db2777',
  grey: '#94a3b8',
} as const;

export const CHART_PALETTE = Object.values(CHART_COLORS);

// Canvas can't read CSS variables, so these mirror --male / --female.
export const GENDER_COLORS = {
  male: '#2563eb',
  female: '#ec4899',
} as const;

// Deep copy that keeps functions (plain objects and arrays are copied, everything else is shared).
function cloneOptions<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(cloneOptions) as T;
  }
  if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneOptions(item)])) as T;
  }
  return value;
}

/**
 * Thin wrapper around Chart.js. The library is loaded on first use, so it stays out of the first page load.
 * Pass plain objects; the chart redraws whenever type, data or options change.
 */
@Component({
  selector: 'app-chart',
  template: `
    <div class="chart-box" [style.height.px]="height()">
      <canvas #canvas role="img" [attr.aria-label]="label()"></canvas>
    </div>
  `,
  styles: `
    :host { display: block; }
    .chart-box { position: relative; width: 100%; }
  `,
})
export class ChartComponent implements OnDestroy {
  readonly type = input.required<ChartType>();
  readonly data = input.required<ChartConfiguration['data']>();
  readonly options = input<ChartConfiguration['options']>({});
  readonly height = input(280);
  readonly label = input('Chart');

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;
  private destroyed = false;

  constructor() {
    effect(() => {
      const type = this.type();
      const data = this.data();
      const options = this.options();
      this.theme.theme();
      void this.render(type, data, options);
    });
  }

  private readonly theme = inject(ThemeService);

  private async render(type: ChartType, data: ChartConfiguration['data'], options: ChartConfiguration['options']) {
    const { Chart } = await import('chart.js/auto');
    if (this.destroyed) return;

    // Canvas ignores CSS, so the theme's text and grid colours are copied into Chart.js defaults.
    const styles = getComputedStyle(document.documentElement);
    Chart.defaults.color = styles.getPropertyValue('--muted-foreground').trim() || Chart.defaults.color;
    Chart.defaults.borderColor = styles.getPropertyValue('--border').trim() || Chart.defaults.borderColor;
    Chart.defaults.elements.arc.borderColor = styles.getPropertyValue('--card').trim() || '#fff';

    // Chart.js mutates what it is given, so hand it copies. Options may hold callbacks, which structuredClone rejects.
    const chartData = structuredClone(data);
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      ...(cloneOptions(options ?? {}) as object),
    };

    if (this.chart && (this.chart.config as { type: ChartType }).type === type) {
      this.chart.data = chartData;
      this.chart.options = chartOptions;
      this.chart.update();
      return;
    }
    this.chart?.destroy();
    this.chart = new Chart(this.canvas().nativeElement, { type, data: chartData, options: chartOptions });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.chart?.destroy();
    this.chart = null;
  }
}
