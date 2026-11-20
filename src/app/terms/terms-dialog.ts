import { DatePipe } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { ToastService } from '../shared/services/toast.service';
import { TERMS_CHECKBOXES, TERMS_SECTIONS, TERMS_VERSION } from './terms.content';
import { TermsService, TermsStatus } from './terms.service';

/**
 * Shows the Terms and data consent. When `required` is true it blocks the app until an admin agrees
 * (the only other choice is to sign out); otherwise it is a read-only copy with the acceptance record.
 */
@Component({
  selector: 'app-terms-dialog',
  imports: [DatePipe],
  templateUrl: './terms-dialog.html',
  styleUrl: './terms-dialog.scss',
})
export class TermsDialog {
  private termsService = inject(TermsService);
  private toast = inject(ToastService);

  readonly required = input(false);
  readonly status = input<TermsStatus | null>(null);
  readonly accepted = output<TermsStatus>();
  readonly closed = output<void>();
  readonly signedOut = output<void>();

  readonly sections = TERMS_SECTIONS;
  readonly labels = TERMS_CHECKBOXES;

  agreedTerms = signal(false);
  agreedConsent = signal(false);
  isSaving = signal(false);

  accept(): void {
    if (!this.agreedTerms() || !this.agreedConsent() || this.isSaving()) return;
    this.isSaving.set(true);
    this.termsService.accept(TERMS_VERSION).subscribe({
      next: status => {
        this.isSaving.set(false);
        this.toast.show('Thank you. Your agreement has been recorded.');
        this.accepted.emit(status);
      },
      error: err => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Could not record your agreement. Please try again.');
      },
    });
  }
}
