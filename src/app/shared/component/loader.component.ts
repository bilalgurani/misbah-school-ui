import { Component, Input } from "@angular/core";

// Shimmering placeholder shown while data loads; `variant` picks a table-like or card-grid shape.
@Component({
  selector: 'app-loader',
  standalone: true,
  template: `
    <div class="skeleton" [class.overlay]="overlay" role="status" aria-live="polite" aria-busy="true">
      <span class="sr-only">{{ message }}</span>

      @if (variant === 'cards') {
        <div class="sk-cards">
          @for (i of items; track i) {
            <div class="sk-block sk-card"></div>
          }
        </div>
      } @else {
        <div class="sk-block sk-head"></div>
        @for (i of items; track i) {
          <div class="sk-row">
            <div class="sk-block sk-cell sk-short"></div>
            <div class="sk-block sk-cell sk-long"></div>
            <div class="sk-block sk-cell sk-medium"></div>
            <div class="sk-block sk-cell sk-medium"></div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .skeleton {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      width: 100%;
      box-sizing: border-box;
    }

    .skeleton.overlay {
      position: absolute;
      inset: 0;
      background: color-mix(in oklch, var(--card, #ffffff) 80%, transparent);
      backdrop-filter: blur(4px);
      z-index: 50;
      border-radius: var(--radius, 12px);
    }

    .sk-block {
      background: linear-gradient(90deg, var(--muted, #f1f5f9) 25%, var(--accent, #e2e8f0) 50%, var(--muted, #f1f5f9) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius, 8px);
    }

    .sk-head { height: 2.25rem; }

    .sk-row {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .sk-cell { height: 1.1rem; }
    .sk-short { flex: 0 0 4rem; }
    .sk-long { flex: 2; }
    .sk-medium { flex: 1; }

    .sk-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .sk-card { height: 6rem; }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      .sk-block { animation: none; }
    }
  `]
})
export class LoaderComponent {
  @Input() message: string = 'Loading...';
  @Input() overlay: boolean = false;
  @Input() variant: 'table' | 'cards' = 'table';
  @Input() rows: number = 5;

  get items(): number[] {
    return Array.from({ length: this.variant === 'cards' ? 4 : this.rows }, (_, i) => i);
  }
}
