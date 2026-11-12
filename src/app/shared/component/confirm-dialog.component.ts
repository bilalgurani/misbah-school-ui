import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    <div class="modal-backdrop" (click)="cancelled.emit()">
      <div class="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
           aria-describedby="confirm-message" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 id="confirm-title">{{ title() }}</h3>
          <button type="button" class="close-btn" (click)="cancelled.emit()" aria-label="Close dialog">&times;</button>
        </div>
        <div class="modal-body">
          <p id="confirm-message">{{ message() }}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" [disabled]="busy()" (click)="cancelled.emit()">Cancel</button>
          <button type="button" class="btn-danger" [disabled]="busy()" (click)="confirmed.emit()">
            {{ busy() ? 'Please wait...' : confirmLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      z-index: 1100;

      @media (min-width: 640px) {
        align-items: center;
        padding: 1rem;
      }
    }

    .modal-card {
      background: var(--popover);
      color: var(--popover-foreground);
      border: 1px solid var(--border);
      border-radius: 16px 16px 0 0;
      width: 100%;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);

      @media (min-width: 640px) {
        border-radius: var(--radius);
        max-width: 440px;
        animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
    }

    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;

      h3 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--foreground);
      }

      .close-btn {
        background: transparent;
        border: none;
        font-size: 1.75rem;
        min-width: 44px;
        min-height: 44px;
        display: grid;
        place-items: center;
        cursor: pointer;
        color: var(--muted-foreground);
        border-radius: var(--radius);
        transition: background-color 0.15s ease, color 0.15s ease;

        &:hover {
          background-color: var(--accent);
          color: var(--accent-foreground);
        }
      }
    }

    .modal-body {
      padding: 1.25rem;

      p {
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.5;
        color: var(--foreground);
      }
    }

    .modal-footer {
      padding: 1rem 1.25rem;
      background: var(--muted);
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column-reverse;
      gap: 0.75rem;

      @media (min-width: 520px) {
        flex-direction: row;
        justify-content: flex-end;
      }

      .btn-secondary,
      .btn-danger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0.625rem 1.25rem;
        border: 1px solid transparent;
        border-radius: var(--radius);
        font-size: 0.875rem;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        width: 100%;
        transition: background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1),
                    box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1),
                    transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);

        &:active:not(:disabled) {
          transform: scale(0.98);
        }

        &:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        @media (min-width: 520px) {
          width: auto;
        }
      }

      .btn-secondary {
        background: var(--secondary);
        border-color: var(--border);
        color: var(--secondary-foreground);

        &:hover:not(:disabled) {
          background: var(--accent);
          color: var(--accent-foreground);
        }
      }

      .btn-danger {
        background: var(--destructive);
        color: #fff;

        &:hover:not(:disabled) {
          background-color: color-mix(in oklch, var(--destructive) 88%, black);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
        }
      }
    }
  `
})
export class ConfirmDialogComponent {
  title = input('Confirm');
  message = input.required<string>();
  confirmLabel = input('Delete');
  busy = input(false);

  confirmed = output<void>();
  cancelled = output<void>();
}
