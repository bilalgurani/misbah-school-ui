import { DecimalPipe } from '@angular/common';
import { Component, signal } from '@angular/core';

export interface LedgerItem {
  id: number;
  description: string;
  category: string;
  type: 'INCOME' | 'EXPENDITURE';
  amount: number;
  transactionDate: string;
}

@Component({
  imports: [DecimalPipe],
  selector: 'app-financial-ledger',
  styleUrl: './financial-ledger.scss',
  templateUrl: './financial-ledger.html',
})
export class FinancialLedger {
  // Mock Summary Data matching project requirements (Income ~11.6L vs Expenditure ~10.8L)
  totalIncome = signal<number>(1169501);
  totalExpenditure = signal<number>(1087782);
  netBalance = signal<number>(this.totalIncome() - this.totalExpenditure());

  // Mock Ledger Entries
  ledgerItems = signal<LedgerItem[]>([
    { id: 1, description: 'Student Admission Fees (Batch 2026)', category: 'FEES', type: 'INCOME', amount: 450000, transactionDate: '2026-05-01' },
    { id: 2, description: 'Monthly Tuition Dues - April', category: 'FEES', type: 'INCOME', amount: 719501, transactionDate: '2026-05-05' },
    { id: 3, description: 'Teacher & Staff Salaries', category: 'SALARY', type: 'EXPENDITURE', amount: 850000, transactionDate: '2026-05-02' },
    { id: 4, description: 'Electricity & Utility Bills', category: 'UTILITIES', type: 'EXPENDITURE', amount: 137782, transactionDate: '2026-05-04' },
    { id: 5, description: 'Lab Equipment Maintenance', category: 'SUPPLIES', type: 'EXPENDITURE', amount: 100000, transactionDate: '2026-05-05' }
  ]);
}
