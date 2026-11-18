import { Component, Input } from "@angular/core";

// Same shimmer skeleton as the student history page: a banner block followed by card blocks.
// `variant="cards"` renders only a row of card blocks (used for KPI tiles).
@Component({
  selector: 'app-loader',
  standalone: true,
  template: `
    <div class="skeleton-wrapper" [class.overlay]="overlay" role="status" aria-live="polite" aria-busy="true">
      <span class="sr-only">{{ message }}</span>

      @if (variant === 'cards') {
        <div class="skeleton-grid">
          @for (i of items; track i) {
            <div class="skeleton-card"></div>
          }
        </div>
      } @else {
        <div class="skeleton-banner"></div>
        <div class="skeleton-timeline">
          @for (i of items; track i) {
            <div class="skeleton-card"></div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    /* Host must be a full-width block, otherwise a flex parent shrinks it to zero width. */
    :host {
      display: block;
      width: 100%;
    }

    .skeleton-wrapper {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1rem;
      width: 100%;
      box-sizing: border-box;
    }

    .skeleton-wrapper.overlay {
      position: absolute;
      inset: 0;
      background: color-mix(in oklch, var(--card, #ffffff) 80%, transparent);
      backdrop-filter: blur(4px);
      z-index: 50;
      border-radius: var(--radius, 12px);
    }

    .skeleton-banner,
    .skeleton-card {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 12px;
    }

    :host-context(.dark) .skeleton-banner,
    :host-context(.dark) .skeleton-card {
      background: linear-gradient(90deg,
        var(--muted) 25%,
        color-mix(in oklch, var(--muted) 78%, white) 50%,
        var(--muted) 75%);
      background-size: 200% 100%;
    }

    .skeleton-banner { height: 160px; }
    .skeleton-card { height: 100px; }

    .skeleton-timeline {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

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
      .skeleton-banner,
      .skeleton-card { animation: none; }
    }
  `]
})
export class LoaderComponent {
  @Input() message: string = 'Loading...';
  @Input() overlay: boolean = false;
  @Input() variant: 'default' | 'cards' = 'default';
  @Input() rows: number = 2;

  get items(): number[] {
    return Array.from({ length: this.variant === 'cards' ? 4 : this.rows }, (_, i) => i);
  }
}
