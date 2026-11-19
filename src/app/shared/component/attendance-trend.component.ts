import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { AttendanceTrend, LOW_ATTENDANCE_PCT } from '../../attendance/attendance-trend.util';

/** Attendance percentage with a green up / red down arrow showing the change from the previous period. */
@Component({
  selector: 'app-attendance-trend',
  imports: [DecimalPipe],
  template: `
    @if (showPct() && (pct() === null || pct() === undefined)) {
      <span class="muted" title="No attendance recorded yet">&mdash;</span>
    } @else {
      <span class="trend" [attr.title]="tooltip()" [attr.aria-label]="label()">
        @if (showPct()) {
          <span class="pct" [class.low]="isLow()">{{ pct() | number: '1.0-0' }}%</span>
        }
        @if (trend(); as t) {
          <span class="arrow" [class.up]="t.direction === 'up'" [class.down]="t.direction === 'down'" [class.flat]="t.direction === 'flat'">
            @switch (t.direction) {
              @case ('up') {
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l8 9h-5v7H9v-7H4z" /></svg>
              }
              @case ('down') {
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20l-8-9h5V4h6v7h5z" /></svg>
              }
              @default {
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11h14v2H5z" /></svg>
              }
            }
            @if (t.direction !== 'flat') { {{ absDelta() | number: '1.0-1' }} }
          </span>
        }
      </span>
    }
  `,
  styles: `
    :host { display: inline-block; white-space: nowrap; }
    .trend { display: inline-flex; align-items: center; gap: 0.4rem; }
    .pct { font-weight: 600; }
    .pct.low { color: var(--absent); }
    .arrow {
      display: inline-flex;
      align-items: center;
      gap: 0.1rem;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 1px 6px 1px 3px;
      border-radius: 999px;
    }
    .arrow svg { width: 14px; height: 14px; fill: currentColor; }
    .arrow.up { color: var(--present); background: color-mix(in oklch, var(--present) 15%, transparent); }
    .arrow.down { color: var(--absent); background: color-mix(in oklch, var(--absent) 15%, transparent); }
    .arrow.flat { color: var(--muted-foreground); background: var(--muted); }
    .muted { color: var(--muted-foreground); }
  `,
})
export class AttendanceTrendComponent {
  readonly pct = input<number | null | undefined>(null);
  readonly trend = input<AttendanceTrend | null | undefined>(null);
  // Text for the tooltip describing what the arrow is compared against.
  readonly comparedWith = input('last month');
  readonly note = input('');
  // Turn off to show only the arrow, for places that already display the percentage.
  readonly showPct = input(true);

  readonly isLow = computed(() => {
    const value = this.pct();
    return value !== null && value !== undefined && value < LOW_ATTENDANCE_PCT;
  });

  readonly absDelta = computed(() => Math.abs(this.trend()?.delta ?? 0));

  readonly label = computed(() => {
    const t = this.trend();
    const subject = this.showPct() ? `${Math.round(this.pct() ?? 0)} percent attendance` : 'Attendance';
    if (!t) return subject;
    if (t.direction === 'flat') return `${subject}, steady compared with ${this.comparedWith()}`;
    const word = t.direction === 'up' ? 'up' : 'down';
    return `${subject}, ${word} ${this.absDelta()} points from ${this.comparedWith()}`;
  });

  readonly tooltip = computed(() => (this.note() ? `${this.label()}. ${this.note()}` : this.label()));
}
