import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TeacherService } from '../../teacher.service';
import { ToastService } from '../../../shared/services/toast.service';
import { todayIso } from '../../../shared/utils/date.util';

type Column = 'name' | 'mobileNo' | 'subjectSpecialization' | 'dateOfJoining' | 'email' | 'qualification' | 'dob' | 'employmentStatus';

// The order of the columns on screen, which is also the order expected when pasting from a spreadsheet.
const COLUMNS: Column[] = ['name', 'mobileNo', 'subjectSpecialization', 'dateOfJoining', 'email', 'qualification', 'dob', 'employmentStatus'];
const MAX_ROWS = 100;
const INITIAL_ROWS = 5;

interface TeacherRow {
  name: string;
  mobileNo: string;
  subjectSpecialization: string;
  dateOfJoining: string;
  email: string;
  qualification: string;
  dob: string;
  employmentStatus: string;
  error: string;
}

const blankRow = (): TeacherRow => ({
  name: '', mobileNo: '', subjectSpecialization: '', dateOfJoining: '', email: '', qualification: '', dob: '',
  employmentStatus: 'ACTIVE', error: '',
});

// Accepts 2026-06-01, 01-06-2026 or 01/06/2026 and returns 2026-06-01 (empty when it can't be read).
function normalizeDate(value: string): string {
  const text = value.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  let y: number, mo: number, d: number;
  if (m) {
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else {
    m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(text);
    if (!m) return '';
    [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return '';
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-add-teachers-bulk',
  styleUrl: './add-teachers-bulk.scss',
  templateUrl: './add-teachers-bulk.html',
})
export class AddTeachersBulk {
  private teacherService = inject(TeacherService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly columns = COLUMNS;
  readonly maxRows = MAX_ROWS;
  readonly today = todayIso();

  rows: TeacherRow[] = Array.from({ length: INITIAL_ROWS }, blankRow);
  isSaving = signal(false);
  // Bumped after every change so the count and the Save button follow what is typed.
  private version = signal(0);

  filledCount = computed(() => {
    this.version();
    return this.rows.filter(r => !this.isBlank(r)).length;
  });

  touched(): void {
    this.version.update(v => v + 1);
  }

  addRows(count: number): void {
    const room = MAX_ROWS - this.rows.length;
    for (let i = 0; i < Math.min(count, room); i++) this.rows.push(blankRow());
    this.touched();
  }

  removeRow(index: number): void {
    this.rows.splice(index, 1);
    if (this.rows.length === 0) this.rows.push(blankRow());
    this.touched();
  }

  clearAll(): void {
    this.rows = Array.from({ length: INITIAL_ROWS }, blankRow);
    this.touched();
  }

  // A row with nothing typed is ignored, so spare rows never block saving.
  private isBlank(r: TeacherRow): boolean {
    return COLUMNS.every(c => c === 'employmentStatus' || !String(r[c]).trim());
  }

  private problem(r: TeacherRow): string {
    if (!r.name.trim()) return 'Enter the name.';
    if (!/^\d{10}$/.test(r.mobileNo.trim())) return 'Phone number must be 10 digits.';
    if (!r.subjectSpecialization.trim()) return 'Enter the subject or role.';
    if (!r.dateOfJoining) return 'Enter the date of joining.';
    if (r.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email.trim())) return 'Enter a valid email address.';
    return '';
  }

  // Lets a block copied from Excel or Google Sheets fill several rows and columns in one paste.
  onPaste(event: ClipboardEvent, rowIndex: number, column: Column): void {
    const text = event.clipboardData?.getData('text') ?? '';
    if (!/[\t\n]/.test(text)) return;
    event.preventDefault();

    const lines = text.replace(/\r/g, '').split('\n');
    while (lines.length > 1 && !lines[lines.length - 1].trim()) lines.pop();
    const startColumn = COLUMNS.indexOf(column);
    lines.forEach((line, i) => {
      const target = rowIndex + i;
      while (this.rows.length <= target && this.rows.length < MAX_ROWS) this.rows.push(blankRow());
      const row = this.rows[target];
      if (!row) return;
      line.split('\t').forEach((cell, j) => {
        const key = COLUMNS[startColumn + j];
        if (!key) return;
        row[key] = this.cleanCell(key, cell);
      });
      row.error = '';
    });
    this.touched();
  }

  private cleanCell(column: Column, value: string): string {
    const text = value.trim();
    switch (column) {
      case 'mobileNo': return text.replace(/\D/g, '').slice(-10);
      case 'dateOfJoining':
      case 'dob': return normalizeDate(text);
      case 'employmentStatus': return text.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
      default: return text;
    }
  }

  save(): void {
    const filled = this.rows.map((row, index) => ({ row, index })).filter(x => !this.isBlank(x.row));
    if (filled.length === 0) {
      this.toast.show('Fill in at least one teacher.', 'error');
      return;
    }
    this.rows.forEach(r => (r.error = ''));
    let invalid = 0;
    for (const { row } of filled) {
      row.error = this.problem(row);
      if (row.error) invalid++;
    }
    if (invalid > 0) {
      this.toast.show(`Fix the ${invalid} highlighted row${invalid === 1 ? '' : 's'} first. Nothing has been saved.`, 'error');
      this.touched();
      return;
    }

    const items = filled.map(({ row }) => ({
      name: row.name.trim(),
      mobileNo: row.mobileNo.trim(),
      subjectSpecialization: row.subjectSpecialization.trim(),
      dateOfJoining: row.dateOfJoining,
      email: row.email.trim() || null,
      qualification: row.qualification.trim() || null,
      dob: row.dob || null,
      employmentStatus: row.employmentStatus,
    }));

    this.isSaving.set(true);
    this.teacherService.createTeachers(items).subscribe({
      next: ({ created }) => {
        this.isSaving.set(false);
        this.toast.show(`${created} teacher${created === 1 ? '' : 's'} added.`);
        this.router.navigate(['/teachers']);
      },
      error: (err) => {
        this.isSaving.set(false);
        const rowErrors: { row: number; message: string }[] = err?.error?.errors ?? [];
        if (err?.status === 400 && rowErrors.length > 0) {
          // The server counts the rows it was sent; map them back to the rows on screen.
          rowErrors.forEach(e => {
            const target = filled[e.row - 1];
            if (target) target.row.error = e.message;
          });
          this.touched();
          this.toast.show(`${rowErrors.length} row${rowErrors.length === 1 ? ' needs' : 's need'} fixing. Nothing has been saved.`, 'error');
          return;
        }
        this.toast.showError(err, 'Failed to add the teachers.');
      },
    });
  }
}
