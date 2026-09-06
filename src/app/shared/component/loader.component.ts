import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loader-container" [class.overlay]="overlay">
      <div class="spinner-box">
        <div class="circle-border">
          <div class="circle-core"></div>
        </div>
        <p *ngIf="message" class="loader-text">{{ message }}</p>
      </div>
    </div>
  `,
  styles: [`
    .loader-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      width: 100%;
    }
    
    .spinner-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .loader-container.overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: color-mix(in oklch, var(--card, #ffffff) 80%, transparent);
      backdrop-filter: blur(4px);
      z-index: 50;
      border-radius: var(--radius, 12px);
    }

    .circle-border {
      width: 54px;
      height: 54px;
      padding: 3px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      /* Exception: Explicit green theme applied to spinner gradient */
      background: linear-gradient(0deg, color-mix(in oklch, var(--chart-3, #16a34a) 15%, transparent) 33%, var(--chart-3, #16a34a) 100%);
      animation: spin 0.8s linear infinite;
    }

    .circle-core {
      width: 100%;
      height: 100%;
      background-color: var(--card, #ffffff);
      border-radius: 50%;
    }

    .loader-text {
      margin-top: 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      /* Exception: Explicit green color applied to loading text */
      color: var(--chart-3, #16a34a);
      letter-spacing: 0.025em;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})

export class LoaderComponent {
  @Input() message: string = 'Loading dashboard stats...';
  @Input() overlay: boolean = false;
}