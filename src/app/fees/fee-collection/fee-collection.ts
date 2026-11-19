import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FeeService, PaymentMode, StudentFeeDetails, StudentInstallmentStatus } from '../fee.service';
import { StudentService } from '../../students/student.service';
import { ToastService } from '../../shared/services/toast.service';
import { LoaderComponent } from '../../shared/component/loader.component';
import { InrPipe } from '../utils/inr.pipe';
import { todayIso } from '../../shared/utils/date.util';

@Component({
  imports: [ReactiveFormsModule, FormsModule, RouterLink, DatePipe, InrPipe, LoaderComponent],
  selector: 'app-fee-collection',
  styleUrl: './fee-collection.scss',
  templateUrl: './fee-collection.html',
})
export class FeeCollection implements OnInit {
  private fb = inject(FormBuilder);
  private feeService = inject(FeeService);
  private studentService = inject(StudentService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly modes: PaymentMode[] = ['CASH', 'UPI', 'CARD', 'BANK', 'CHEQUE'];

  students = signal<any[]>([]);
  studentsLoading = signal<boolean>(false);
  searchQuery = signal<string>('');

  details = signal<StudentFeeDetails | null>(null);
  isLoading = signal<boolean>(false);
  loadFailed = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  collectingId = signal<number | null>(null);
  submitted = signal<boolean>(false);
  voidingId = signal<number | null>(null);
  voidReason = signal<string>('');

  matches = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];
    return this.students()
      .filter(s =>
        (s.name ?? '').toLowerCase().includes(query) ||
        (s.rollNo !== null && s.rollNo !== undefined && String(s.rollNo).toLowerCase().includes(query)))
      .slice(0, 8);
  });

  collectForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    paidOn: [todayIso(), Validators.required],
    mode: ['CASH' as PaymentMode, Validators.required],
    reference: [''],
  });

  ngOnInit(): void {
    this.studentsLoading.set(true);
    this.studentService.getStudents().subscribe({
      next: (data) => {
        this.students.set(data);
        this.studentsLoading.set(false);
      },
      error: (err) => {
        this.studentsLoading.set(false);
        this.toast.showError(err, 'Failed to load students');
      },
    });

    this.route.queryParamMap.subscribe(params => {
      const id = Number(params.get('studentId'));
      if (id > 0 && this.details()?.studentId !== id) this.loadFees(id);
    });
  }

  selectStudent(student: any): void {
    this.searchQuery.set('');
    this.loadFees(student.id);
  }

  loadFees(studentId: number): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.collectingId.set(null);
    this.feeService.getStudentFees(studentId).subscribe({
      next: (data) => {
        this.details.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.details.set(null);
        this.isLoading.set(false);
        this.loadFailed.set(true);
        this.toast.showError(err, 'Failed to load fee details');
      },
    });
  }

  openCollect(installment: StudentInstallmentStatus): void {
    this.submitted.set(false);
    this.collectingId.set(installment.installmentId);
    this.collectForm.reset({
      amount: installment.balance,
      paidOn: todayIso(),
      mode: 'CASH',
      reference: '',
    });
  }

  closeCollect(): void {
    this.collectingId.set(null);
  }

  openVoid(paymentId: number): void {
    this.voidingId.set(paymentId);
    this.voidReason.set('');
  }

  confirmVoid(): void {
    const id = this.voidingId();
    const data = this.details();
    const reason = this.voidReason().trim();
    if (id === null || !data || !reason) return;
    this.isSaving.set(true);
    this.feeService.voidPayment(id, reason).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.voidingId.set(null);
        this.toast.show('Payment voided.');
        this.loadFees(data.studentId);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Failed to void the payment');
      },
    });
  }

  isOverBalance(installment: StudentInstallmentStatus): boolean {
    return Number(this.collectForm.controls.amount.value) > installment.balance;
  }

  collect(installment: StudentInstallmentStatus): void {
    const data = this.details();
    this.submitted.set(true);
    if (!data || this.collectForm.invalid || this.isOverBalance(installment)) return;

    const value = this.collectForm.getRawValue();
    this.isSaving.set(true);
    this.feeService.recordPayment({
      studentId: data.studentId,
      installmentId: installment.installmentId,
      amount: Number(value.amount),
      paidOn: value.paidOn,
      mode: value.mode,
      reference: value.reference.trim() || null,
    }).subscribe({
      next: (receipt) => {
        this.isSaving.set(false);
        this.toast.show(`Payment recorded. Receipt ${receipt.receiptNo}`);
        this.router.navigate(['/fees/receipt', receipt.id]);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Failed to record payment');
      },
    });
  }
}
