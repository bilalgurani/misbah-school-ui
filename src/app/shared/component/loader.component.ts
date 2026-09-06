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
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(4px);
      z-index: 50;
      border-radius: 12px;
    }
    .circle-border {
      width: 54px;
      height: 54px;
      padding: 3px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      background: linear-gradient(0deg, rgba(79, 70, 229, 0.1) 33%, rgba(79, 70, 229, 1) 100%);
      animation: spin .8s linear infinite;
    }
    .circle-core {
      width: 100%;
      height: 100%;
      background-color: #ffffff;
      border-radius: 50%;
    }
    .loader-text {
      margin-top: 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #4f46e5;
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