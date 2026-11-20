import { Component, computed, input, output } from '@angular/core';

/** Page controls for a list that is paged on screen: "Showing 1–25 of 133", rows per page, Prev / Next. */
@Component({
  selector: 'app-pager',
  template: `
    @if (total() > 0) {
      <div class="pager">
        <span class="range">Showing {{ start() }}&ndash;{{ end() }} of {{ total() }}</span>
        <div class="controls">
          <label class="size">
            <span>Rows per page</span>
            <select [value]="pageSize()" (change)="pageSizeChange.emit(+$any($event.target).value)" aria-label="Rows per page">
              @for (size of pageSizes(); track size) {
                <option [value]="size" [selected]="size === pageSize()">{{ size }}</option>
              }
            </select>
          </label>
          <div class="buttons">
            <button type="button" (click)="pageChange.emit(page() - 1)" [disabled]="page() <= 1">Prev</button>
            <span class="where">Page {{ page() }} of {{ totalPages() }}</span>
            <button type="button" (click)="pageChange.emit(page() + 1)" [disabled]="page() >= totalPages()">Next</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .pager {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      background: var(--muted);
      border-top: 1px solid var(--border);
      font-size: 0.85rem;
      color: var(--muted-foreground);
    }

    .controls {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .size {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    select {
      min-height: 36px;
      padding: 0.25rem 0.5rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--background);
      color: var(--foreground);
      font-family: inherit;
      font-size: 0.85rem;
    }

    .buttons {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    button {
      min-height: 36px;
      padding: 0.25rem 0.875rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--secondary);
      color: var(--secondary-foreground);
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;

      &:hover:not(:disabled) {
        background: var(--accent);
        color: var(--accent-foreground);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .where {
      white-space: nowrap;
    }
  `,
})
export class PagerComponent {
  total = input.required<number>();
  /** The current page, counted from 1. */
  page = input.required<number>();
  pageSize = input.required<number>();
  pageSizes = input<number[]>([10, 25, 50, 100]);

  pageChange = output<number>();
  pageSizeChange = output<number>();

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  start = computed(() => (this.page() - 1) * this.pageSize() + 1);
  end = computed(() => Math.min(this.total(), this.page() * this.pageSize()));
}
