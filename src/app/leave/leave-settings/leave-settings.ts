import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LeaveService, LeaveType } from '../leave.service';
import { LeaveTeacherOption } from '../leave-apply-form/leave-apply-form';
import { LeaveTypesPanel } from './leave-types-panel/leave-types-panel';
import { LeaveBalancesPanel } from './leave-balances-panel/leave-balances-panel';
import { LeaveAdjustmentsPanel } from './leave-adjustments-panel/leave-adjustments-panel';
import { AcademicYearService } from '../../academics/services/academic-year.service';
import { AcademicYear } from '../../academics/models/academic-year.model';
import { TeacherService } from '../../teachers/teacher.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  imports: [FormsModule, LeaveTypesPanel, LeaveBalancesPanel, LeaveAdjustmentsPanel],
  selector: 'app-leave-settings',
  styleUrl: './leave-settings.scss',
  templateUrl: './leave-settings.html',
})
export class LeaveSettings implements OnInit {
  private leaveService = inject(LeaveService);
  private yearService = inject(AcademicYearService);
  private teacherService = inject(TeacherService);
  private toast = inject(ToastService);

  leaveTypes = signal<LeaveType[]>([]);
  typesLoading = signal<boolean>(true);
  academicYears = signal<AcademicYear[]>([]);
  yearId = signal<number | null>(null);
  teachers = signal<LeaveTeacherOption[]>([]);
  refreshKey = signal<number>(0);

  ngOnInit(): void {
    this.loadTypes();
    this.yearService.getAll().subscribe({
      next: (years) => {
        this.academicYears.set(years);
        const current = years.find(y => y.current) ?? years[0];
        this.yearId.set(current?.id ?? null);
      },
      error: (err) => this.toast.showError(err, 'Failed to load academic years'),
    });
    this.teacherService.getTeachers().subscribe({
      next: (list) => this.teachers.set(list.map(t => ({ id: t.id, name: t.name }))),
      error: (err) => this.toast.showError(err, 'Failed to load teachers'),
    });
  }

  loadTypes(): void {
    this.typesLoading.set(true);
    this.leaveService.getTypes(true).subscribe({
      next: (types) => {
        this.leaveTypes.set(types);
        this.typesLoading.set(false);
      },
      error: (err) => {
        this.typesLoading.set(false);
        this.toast.showError(err, 'Failed to load leave types');
      },
    });
  }

  onYearChange(value: number | null): void {
    this.yearId.set(value ? Number(value) : null);
  }

  onTypesChanged(): void {
    this.loadTypes();
    this.refreshKey.update(k => k + 1);
  }

  onAdjusted(): void {
    this.refreshKey.update(k => k + 1);
  }
}
