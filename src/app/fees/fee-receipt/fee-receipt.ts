import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FeeReceipt as FeeReceiptDto, FeeService } from '../fee.service';
import { ToastService } from '../../shared/services/toast.service';
import { LoaderComponent } from '../../shared/component/loader.component';
import { InrPipe } from '../utils/inr.pipe';
import { amountInWords } from '../utils/amount-words.util';

@Component({
  imports: [DatePipe, RouterLink, InrPipe, LoaderComponent],
  selector: 'app-fee-receipt',
  styleUrl: './fee-receipt.scss',
  templateUrl: './fee-receipt.html',
})
export class FeeReceipt implements OnInit {
  private feeService = inject(FeeService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  receipt = signal<FeeReceiptDto | null>(null);
  isLoading = signal<boolean>(true);
  loadFailed = signal<boolean>(false);

  words = computed(() => {
    const r = this.receipt();
    return r ? amountInWords(r.amount) : '';
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id > 0) this.load(id);
      else {
        this.isLoading.set(false);
        this.loadFailed.set(true);
      }
    });
  }

  private load(id: number): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.feeService.getReceipt(id).subscribe({
      next: (data) => {
        this.receipt.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.loadFailed.set(true);
        this.toast.showError(err, 'Failed to load receipt');
      },
    });
  }

  print(): void {
    window.print();
  }
}
