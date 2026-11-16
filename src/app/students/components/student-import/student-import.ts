import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { BulkImportResponse, BulkRowResult, BulkStudentRow, StudentBulkService } from '../../student-bulk.service';
import { AttendanceApiService } from '../../../attendance/services/attendance-api.service';
import { ClassSection } from '../../../attendance/models/attendance.models';
import { ToastService } from '../../../shared/services/toast.service';
import { LoaderComponent } from '../../../shared/component/loader.component';
import { ConfirmDialogComponent } from '../../../shared/component/confirm-dialog.component';
import { downloadCsv, parseCsv, toCsv } from '../../../shared/utils/csv.util';
import { todayIso } from '../../../shared/utils/date.util';

export const IMPORT_COLUMNS = [
  'Name', 'RollNo', 'SatsNo', 'Gender', 'FatherName', 'MotherName', 'DOB', 'AadharNo', 'Address',
  'MobileNo', 'DateOfAdmission', 'BloodGroup', 'EmergencyContactName', 'EmergencyContactNo', 'Class', 'Division',
] as const;

type ImportColumn = typeof IMPORT_COLUMNS[number];

const MAX_ROWS = 1000;
const REQUIRED_COLUMNS: ImportColumn[] = ['Name', 'Class', 'Division'];

interface PreviewRow {
  rowNumber: number;
  raw: Record<ImportColumn, string>;
  payload: BulkStudentRow;
  clientErrors: string[];
  serverStatus: BulkRowResult['status'] | null;
  serverErrors: string[];
}

const blankToNull = (value: string): string | null => value.trim() === '' ? null : value.trim();

const normalizeHeader = (value: string): string => value.toLowerCase().replace(/[\s_]+/g, '');

const pad = (n: number): string => String(n).padStart(2, '0');

function normalizeDate(value: string): string | null {
  const text = value.trim();
  let year: number, month: number, day: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (match) {
    [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    match = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(text);
    if (!match) return null;
    [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function normalizeGender(value: string): string | null {
  const text = value.trim().toLowerCase();
  if (text === 'male') return 'Male';
  if (text === 'female') return 'Female';
  if (text === 'other') return 'Other';
  return null;
}

@Component({
  imports: [RouterLink, LoaderComponent, ConfirmDialogComponent],
  selector: 'app-student-import',
  styleUrl: './student-import.scss',
  templateUrl: './student-import.html',
})
export class StudentImport implements OnInit {
  private bulkService = inject(StudentBulkService);
  private attendanceApi = inject(AttendanceApiService);
  private toast = inject(ToastService);

  readonly maxRows = MAX_ROWS;

  sections = signal<ClassSection[]>([]);
  sectionsLoading = signal<boolean>(true);
  fileName = signal<string>('');
  rows = signal<PreviewRow[]>([]);
  fileError = signal<string>('');
  isParsing = signal<boolean>(false);
  isValidating = signal<boolean>(false);
  isImporting = signal<boolean>(false);
  confirmOpen = signal<boolean>(false);
  validated = signal<boolean>(false);
  summary = signal<{ total: number; valid: number; imported: number; failed: number; dryRun: boolean } | null>(null);

  clientValidCount = computed(() => this.rows().filter(r => r.clientErrors.length === 0).length);
  clientInvalidCount = computed(() => this.rows().length - this.clientValidCount());

  importableRows = computed(() =>
    this.rows().filter(r =>
      r.clientErrors.length === 0 &&
      (r.serverStatus === null || r.serverStatus === 'OK')));

  importedCount = computed(() => this.rows().filter(r => r.serverStatus === 'IMPORTED').length);

  failedRows = computed(() =>
    this.rows().filter(r => r.clientErrors.length > 0 || r.serverStatus === 'ERROR'));

  ngOnInit(): void {
    this.attendanceApi.getClassSections().subscribe({
      next: (data) => {
        this.sections.set(data);
        this.sectionsLoading.set(false);
      },
      error: (err) => {
        this.sectionsLoading.set(false);
        this.toast.showError(err, 'Failed to load class sections');
      },
    });
  }

  downloadTemplate(): void {
    const first = this.sections()[0];
    const sample = [
      'Asha Verma', '12', 'SATS12345', 'Female', 'Ramesh Verma', 'Sunita Verma', '2015-04-21', '123412341234',
      '12 MG Road, Bengaluru', '9876543210', '2024-06-03', 'B+', 'Ramesh Verma', '9876543211',
      first?.levelName ?? '5', first?.division ?? 'A',
    ];
    downloadCsv('student-import-template.csv', toCsv([[...IMPORT_COLUMNS], sample]));
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.resetResults();
    this.rows.set([]);
    this.fileName.set(file.name);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.fileError.set('Please choose a .csv file.');
      return;
    }

    this.isParsing.set(true);
    try {
      const table = parseCsv(await file.text()).filter(r => r.some(c => c.trim() !== ''));
      this.buildPreview(table);
    } catch {
      this.fileError.set('The file could not be read.');
    } finally {
      this.isParsing.set(false);
    }
  }

  private buildPreview(table: string[][]): void {
    this.fileError.set('');
    if (table.length === 0) {
      this.fileError.set('The file is empty.');
      return;
    }

    const headerIndex = new Map<string, number>();
    table[0].forEach((h, i) => {
      const key = normalizeHeader(h);
      if (!headerIndex.has(key)) headerIndex.set(key, i);
    });

    const missing = REQUIRED_COLUMNS.filter(c => !headerIndex.has(normalizeHeader(c)));
    if (missing.length > 0) {
      this.fileError.set(`Missing required column(s): ${missing.join(', ')}. Use the template for the exact header row.`);
      return;
    }

    const dataRows = table.slice(1);
    if (dataRows.length === 0) {
      this.fileError.set('The file has a header row but no student rows.');
      return;
    }
    if (dataRows.length > MAX_ROWS) {
      this.fileError.set(`The file has ${dataRows.length} rows. Maximum allowed is ${MAX_ROWS}; split it into smaller files.`);
      return;
    }

    this.rows.set(dataRows.map((cells, i) => {
      const raw = {} as Record<ImportColumn, string>;
      for (const column of IMPORT_COLUMNS) {
        const idx = headerIndex.get(normalizeHeader(column));
        raw[column] = idx === undefined ? '' : (cells[idx] ?? '').trim();
      }
      return this.toPreviewRow(i + 2, raw);
    }));
  }

  private toPreviewRow(rowNumber: number, raw: Record<ImportColumn, string>): PreviewRow {
    const errors: string[] = [];

    if (!raw.Name) errors.push('Name is required');
    if (!raw.Class) errors.push('Class is required');
    if (!raw.Division) errors.push('Division is required');

    let gender: string | null = null;
    if (raw.Gender) {
      gender = normalizeGender(raw.Gender);
      if (!gender) errors.push('Gender must be Male, Female or Other');
    }

    const dateField = (label: string, value: string): string | null => {
      if (!value) return null;
      const normalized = normalizeDate(value);
      if (!normalized) errors.push(`${label} must be YYYY-MM-DD, DD-MM-YYYY or DD/MM/YYYY`);
      return normalized;
    };
    const dob = dateField('DOB', raw.DOB);
    const dateOfAdmission = dateField('DateOfAdmission', raw.DateOfAdmission);

    let rollNo: number | null = null;
    if (raw.RollNo) {
      if (/^\d{1,9}$/.test(raw.RollNo)) rollNo = Number(raw.RollNo);
      else errors.push('RollNo must be a whole number');
    }

    const mobile = raw.MobileNo.replace(/\s+/g, '');
    if (mobile && !/^\d{10}$/.test(mobile)) errors.push('MobileNo must be 10 digits');

    return {
      rowNumber,
      raw,
      clientErrors: errors,
      serverStatus: null,
      serverErrors: [],
      payload: {
        rowNumber,
        name: raw.Name,
        rollNo,
        satsNo: blankToNull(raw.SatsNo),
        gender,
        fatherName: blankToNull(raw.FatherName),
        motherName: blankToNull(raw.MotherName),
        dob,
        aadharNo: blankToNull(raw.AadharNo),
        address: blankToNull(raw.Address),
        mobileNo: blankToNull(mobile),
        dateOfAdmission,
        bloodGroup: blankToNull(raw.BloodGroup),
        emergencyContactName: blankToNull(raw.EmergencyContactName),
        emergencyContactNo: blankToNull(raw.EmergencyContactNo),
        className: raw.Class,
        division: raw.Division,
      },
    };
  }

  private resetResults(): void {
    this.validated.set(false);
    this.summary.set(null);
    this.confirmOpen.set(false);
    this.fileError.set('');
  }

  clearFile(): void {
    this.rows.set([]);
    this.fileName.set('');
    this.resetResults();
  }

  validateWithServer(): void {
    const candidates = this.rows().filter(r => r.clientErrors.length === 0 && r.serverStatus !== 'IMPORTED');
    if (candidates.length === 0) {
      this.toast.show('There are no valid rows to validate.', 'error');
      return;
    }

    this.isValidating.set(true);
    this.post(candidates, true).subscribe({
      next: (res) => {
        this.isValidating.set(false);
        this.applyResults(res);
        this.validated.set(true);
        this.summary.set({ total: res.total, valid: res.valid, imported: res.imported, failed: res.failed, dryRun: true });
        this.toast.show(`Validation finished: ${res.valid} valid, ${res.failed} with errors.`, res.failed > 0 ? 'error' : 'success');
      },
      error: (err) => {
        this.isValidating.set(false);
        this.toast.showError(err, 'Server validation failed');
      },
    });
  }

  requestImport(): void {
    if (this.importableRows().length === 0) {
      this.toast.show('There are no valid rows to import.', 'error');
      return;
    }
    this.confirmOpen.set(true);
  }

  cancelImport(): void {
    if (!this.isImporting()) this.confirmOpen.set(false);
  }

  importRows(): void {
    const candidates = this.importableRows();
    if (candidates.length === 0) return;

    this.isImporting.set(true);
    this.post(candidates, false).subscribe({
      next: (res) => {
        this.isImporting.set(false);
        this.confirmOpen.set(false);
        this.applyResults(res);
        this.summary.set({ total: res.total, valid: res.valid, imported: res.imported, failed: res.failed, dryRun: false });
        this.toast.show(`Imported ${res.imported} student(s), ${res.failed} failed.`, res.failed > 0 ? 'error' : 'success');
      },
      error: (err) => {
        this.isImporting.set(false);
        this.confirmOpen.set(false);
        this.toast.showError(err, 'Import failed');
      },
    });
  }

  private post(candidates: PreviewRow[], dryRun: boolean): Observable<BulkImportResponse> {
    return this.bulkService.import(candidates.map(r => r.payload), dryRun);
  }

  private applyResults(res: BulkImportResponse): void {
    const byRow = new Map((res.results ?? []).map(r => [r.rowNumber, r]));
    this.rows.update(list => list.map(row => {
      const result = byRow.get(row.rowNumber);
      return result ? { ...row, serverStatus: result.status, serverErrors: result.errors ?? [] } : row;
    }));
  }

  errorText(row: PreviewRow): string {
    return [...row.clientErrors, ...row.serverErrors].join('; ');
  }

  downloadErrorReport(): void {
    const failed = this.failedRows();
    if (failed.length === 0) return;
    const csv = toCsv([
      ['RowNumber', ...IMPORT_COLUMNS, 'Errors'],
      ...failed.map(r => [r.rowNumber, ...IMPORT_COLUMNS.map(c => r.raw[c]), this.errorText(r)]),
    ]);
    downloadCsv(`student-import-errors-${todayIso()}.csv`, csv);
  }
}
