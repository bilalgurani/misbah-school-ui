import { Component, input } from '@angular/core';
import type { ChartConfiguration, ChartType } from 'chart.js';
import { ChartComponent } from './chart.component';

export const INR_TICKS = { format: { style: 'currency', currency: 'INR', maximumFractionDigits: 0 } } as const;

@Component({
  selector: 'app-chart-card',
  imports: [ChartComponent],
  template: `
    <section class="chart-card">
      <h3>{{ title() }}</h3>
      @if (empty()) {
        <p class="empty">{{ emptyMessage() }}</p>
      } @else {
        <app-chart [type]="type()" [data]="data()" [options]="options()" [height]="height()" [label]="label() || title()" />
      }
    </section>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .chart-card {
      background: var(--card);
      color: var(--card-foreground);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      padding: 1rem;
      height: 100%;
      box-sizing: border-box;
    }
    h3 { margin: 0 0 0.75rem; font-size: 1rem; font-weight: 700; }
    .empty { margin: 0; padding: 2rem 0.5rem; text-align: center; color: var(--muted-foreground); font-size: 0.9rem; }
    @media print { :host { display: none; } }
  `,
})
export class ChartCardComponent {
  readonly title = input.required<string>();
  readonly type = input.required<ChartType>();
  readonly data = input.required<ChartConfiguration['data']>();
  readonly options = input<ChartConfiguration['options']>({});
  readonly height = input(280);
  readonly label = input('');
  readonly empty = input(false);
  readonly emptyMessage = input('No data to show yet.');
}
