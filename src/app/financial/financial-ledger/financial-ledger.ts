import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AcademicYearService } from '../../academics/services/academic-year.service';
import { InrPipe } from '../../fees/utils/inr.pipe';
import { LoaderComponent } from '../../shared/component/loader.component';
import { ToastService } from '../../shared/services/toast.service';
import { downloadCsv, toCsv } from '../../shared/utils/csv.util';
import { todayIso } from '../../shared/utils/date.util';
import {
  LedgerCategories, LedgerEntry, LedgerFilters, LedgerMode, LedgerService, LedgerSummary, LedgerType,
} from '../ledger.service';

const PAGE_SIZE = 50;
const EXPORT_PAGE_SIZE = 200;
const EXPORT_MAX_ROWS = 5000;

export const LEDGER_MODES: LedgerMode[] = ['CASH', 'UPI', 'CARD', 'BANK', 'CHEQUE'];

export function ledgerLabel(value: string | null | undefined): string {
  const text = (value ?? '').replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isoOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

interface Bar {
  label: string;
  total: number;
  pct: number;
}

@Component({
  imports: [FormsModule, ReactiveFormsModule, RouterLink, DatePipe, InrPipe, LoaderComponent],
  selector: 'app-financial-ledger',
  styleUrl: './financial-ledger.scss',
  templateUrl: './financial-ledger.html',
})
export class FinancialLedger implements OnInit, OnDestroy {
  private ledger = inject(LedgerService);
  private academicYears = inject(AcademicYearService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder).nonNullable;
  private entriesRequest?: Subscription;
  private summaryRequest?: Subscription;

  readonly pageSize = PAGE_SIZE;
  readonly modes = LEDGER_MODES;
  readonly label = ledgerLabel;

  filters: LedgerFilters = { from: '', to: '', type: '', category: '' };
  private applied: LedgerFilters = { ...this.filters };

  categories = signal<LedgerCategories>({ income: [], expense: [] });
  yearRange = signal<{ from: string; to: string } | null>(null);
  summary = signal<LedgerSummary | null>(null);
  summaryLoading = signal<boolean>(true);
  summaryError = signal<boolean>(false);
  items = signal<LedgerEntry[]>([]);
  total = signal<number>(0);
  page = signal<number>(0);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);
  exporting = signal<boolean>(false);

  addOpen = signal<boolean>(false);
  saving = signal<boolean>(false);
  voidTarget = signal<LedgerEntry | null>(null);
  voidReason = '';
  voiding = signal<boolean>(false);

  entryForm = this.fb.group({
    entryDate: [todayIso(), Validators.required],
    type: ['EXPENSE' as LedgerType, Validators.required],
    category: ['', Validators.required],
    description: ['', [Validators.required, Validators.maxLength(255)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    mode: ['CASH' as LedgerMode, Validators.required],
    reference: [''],
  });
  formType = signal<LedgerType>('EXPENSE');
  typeFilter = signal<'' | LedgerType>('');

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  rangeStart = computed(() => (this.total() === 0 ? 0 : this.page() * PAGE_SIZE + 1));
  rangeEnd = computed(() => Math.min(this.total(), this.page() * PAGE_SIZE + this.items().length));

  filterCategories = computed(() => {
    const cats = this.categories();
    const type = this.typeFilter();
    if (type === 'INCOME') return this.withFees(cats.income);
    if (type === 'EXPENSE') return cats.expense;
    return Array.from(new Set([...this.withFees(cats.income), ...cats.expense]));
  });
  formCategories = computed(() => this.categories()[this.formType() === 'INCOME' ? 'income' : 'expense']);

  expenseBars = computed(() => this.bars('EXPENSE'));
  incomeBars = computed(() => this.bars('INCOME'));

  months = computed(() => {
    const rows = this.summary()?.monthly ?? [];
    const max = Math.max(0, ...rows.map(m => Math.max(m.income, m.expense)));
    return rows.map(m => ({
      ...m,
      incomePct: max > 0 ? (m.income / max) * 100 : 0,
      expensePct: max > 0 ? (m.expense / max) * 100 : 0,
    }));
  });

  ngOnInit(): void {
    this.ledger.getCategories().subscribe({
      next: cats => this.categories.set({ income: cats?.income ?? [], expense: cats?.expense ?? [] }),
      error: err => this.toast.showError(err, 'Failed to load ledger categories.'),
    });
    this.academicYears.getCurrent().subscribe({
      next: year => {
        if (year?.startDate && year?.endDate) {
          this.yearRange.set({ from: year.startDate.slice(0, 10), to: year.endDate.slice(0, 10) });
          this.filters.from = year.startDate.slice(0, 10);
          this.filters.to = year.endDate.slice(0, 10);
        }
        this.search();
      },
      error: () => this.search(),
    });
  }

  ngOnDestroy(): void {
    this.entriesRequest?.unsubscribe();
    this.summaryRequest?.unsubscribe();
  }

  setPreset(preset: 'month' | 'lastMonth' | 'year'): void {
    const now = new Date();
    if (preset === 'month') {
      this.filters.from = isoOf(new Date(now.getFullYear(), now.getMonth(), 1));
      this.filters.to = isoOf(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (preset === 'lastMonth') {
      this.filters.from = isoOf(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      this.filters.to = isoOf(new Date(now.getFullYear(), now.getMonth(), 0));
    } else {
      const range = this.yearRange();
      this.filters.from = range?.from ?? '';
      this.filters.to = range?.to ?? '';
    }
    this.search();
  }

  onTypeChange(type: '' | LedgerType): void {
    this.filters.type = type;
    this.typeFilter.set(type);
    if (this.filters.category && !this.filterCategories().includes(this.filters.category)) {
      this.filters.category = '';
    }
  }

  reset(): void {
    this.filters = { from: '', to: '', type: '', category: '' };
    this.typeFilter.set('');
    this.search();
  }

  search(): void {
    if (this.filters.from && this.filters.to && this.filters.to < this.filters.from) {
      this.toast.show('The "to" date must not be before the "from" date.', 'error');
      return;
    }
    this.applied = { ...this.filters };
    this.loadSummary();
    this.loadEntries(0);
  }

  refresh(): void {
    this.loadSummary();
    this.loadEntries(this.page());
  }

  prev(): void {
    if (this.page() > 0 && !this.isLoading()) this.loadEntries(this.page() - 1);
  }

  next(): void {
    if (this.page() + 1 < this.totalPages() && !this.isLoading()) this.loadEntries(this.page() + 1);
  }

  loadEntries(page: number): void {
    this.entriesRequest?.unsubscribe();
    this.isLoading.set(true);
    this.hasError.set(false);
    this.entriesRequest = this.ledger.getEntries(this.applied, page, PAGE_SIZE).subscribe({
      next: res => {
        this.items.set(res.items ?? []);
        this.total.set(res.total ?? 0);
        this.page.set(res.page ?? page);
        this.isLoading.set(false);
      },
      error: err => {
        this.items.set([]);
        this.total.set(0);
        this.hasError.set(true);
        this.isLoading.set(false);
        this.toast.showError(err, 'Failed to load transactions.');
      },
    });
  }

  loadSummary(): void {
    this.summaryRequest?.unsubscribe();
    this.summaryLoading.set(true);
    this.summaryError.set(false);
    this.summaryRequest = this.ledger.getSummary(this.applied).subscribe({
      next: res => {
        this.summary.set(res);
        this.summaryLoading.set(false);
      },
      error: err => {
        this.summary.set(null);
        this.summaryError.set(true);
        this.summaryLoading.set(false);
        this.toast.showError(err, 'Failed to load the summary.');
      },
    });
  }

  monthLabel(month: string): string {
    const [year, mon] = month.split('-').map(Number);
    return new Date(year, (mon || 1) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }

  openAdd(): void {
    this.entryForm.reset({
      entryDate: todayIso(), type: 'EXPENSE', category: '', description: '', amount: null, mode: 'CASH', reference: '',
    });
    this.formType.set('EXPENSE');
    this.addOpen.set(true);
  }

  closeAdd(): void {
    if (!this.saving()) this.addOpen.set(false);
  }

  onFormTypeChange(): void {
    this.formType.set(this.entryForm.controls.type.value);
    this.entryForm.controls.category.setValue('');
  }

  saveEntry(): void {
    if (this.entryForm.invalid) {
      this.entryForm.markAllAsTouched();
      return;
    }
    const v = this.entryForm.getRawValue();
    const description = v.description.trim();
    if (!description) {
      this.entryForm.controls.description.setErrors({ required: true });
      this.entryForm.controls.description.markAsTouched();
      return;
    }
    this.saving.set(true);
    this.ledger.create({
      entryDate: v.entryDate,
      type: v.type,
      category: v.category,
      description,
      amount: Number(v.amount),
      mode: v.mode,
      reference: v.reference.trim() || undefined,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.addOpen.set(false);
        this.toast.show('Entry added.');
        this.refresh();
      },
      error: err => {
        this.saving.set(false);
        this.toast.showError(err, 'Failed to add the entry.');
      },
    });
  }

  openVoid(entry: LedgerEntry): void {
    this.voidReason = '';
    this.voidTarget.set(entry);
  }

  closeVoid(): void {
    if (!this.voiding()) this.voidTarget.set(null);
  }

  confirmVoid(): void {
    const target = this.voidTarget();
    const reason = this.voidReason.trim();
    if (!target || !reason) return;
    this.voiding.set(true);
    this.ledger.voidEntry(target.id, reason).subscribe({
      next: () => {
        this.voiding.set(false);
        this.voidTarget.set(null);
        this.toast.show('Entry voided.');
        this.refresh();
      },
      error: err => {
        this.voiding.set(false);
        this.toast.showError(err, 'Failed to void the entry.');
      },
    });
  }

  async exportCsv(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      const all: LedgerEntry[] = [];
      let page = 0;
      let total = 0;
      do {
        const res = await new Promise<{ items: LedgerEntry[]; total: number }>((resolve, reject) =>
          this.ledger.getEntries(this.applied, page, EXPORT_PAGE_SIZE).subscribe({ next: resolve, error: reject }));
        const batch = res.items ?? [];
        all.push(...batch);
        total = res.total ?? 0;
        page++;
        if (batch.length === 0) break;
      } while (all.length < total && all.length < EXPORT_MAX_ROWS);

      if (all.length === 0) {
        this.toast.show('There are no transactions to export.', 'error');
        return;
      }
      const rows = all.slice(0, EXPORT_MAX_ROWS).map(e => [
        e.entryDate, ledgerLabel(e.type), ledgerLabel(e.category), e.description, e.amount,
        ledgerLabel(e.mode), e.reference ?? '', e.voided ? `Voided: ${e.voidReason ?? ''}` : 'Active',
      ]);
      const part = this.applied.from || this.applied.to ? `${this.applied.from || 'start'}_to_${this.applied.to || 'end'}` : 'all';
      downloadCsv(`ledger-${part}.csv`, toCsv([['Date', 'Type', 'Category', 'Description', 'Amount', 'Mode', 'Reference', 'Status'], ...rows]));
      if (total > EXPORT_MAX_ROWS) this.toast.show(`Exported the first ${EXPORT_MAX_ROWS} of ${total} rows. Narrow the dates to export the rest.`);
    } catch (err) {
      this.toast.showError(err, 'Failed to export the ledger.');
    } finally {
      this.exporting.set(false);
    }
  }

  private withFees(income: string[]): string[] {
    return income.includes('FEES') ? income : ['FEES', ...income];
  }

  private bars(type: LedgerType): Bar[] {
    const rows = (this.summary()?.byCategory ?? []).filter(c => c.type === type).sort((a, b) => b.total - a.total);
    const max = Math.max(0, ...rows.map(r => r.total));
    return rows.map(r => ({ label: ledgerLabel(r.category), total: r.total, pct: max > 0 ? (r.total / max) * 100 : 0 }));
  }
}
