import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ClassApiService } from '../../services/class-api.service';
import { ClassLevel, ClassSectionItem } from '../../models/class.models';
import { ToastService } from '../../../shared/services/toast.service';
import { LoaderComponent } from '../../../shared/component/loader.component';
import { ConfirmDialogComponent } from '../../../shared/component/confirm-dialog.component';

type FormMode = 'level' | 'section';

interface DeleteTarget {
  kind: FormMode;
  id: number;
  label: string;
}

@Component({
  imports: [FormsModule, LoaderComponent, ConfirmDialogComponent],
  selector: 'app-class-management',
  styleUrl: './class-management.scss',
  templateUrl: './class-management.html',
})
export class ClassManagement implements OnInit {
  private api = inject(ClassApiService);
  private toast = inject(ToastService);

  levels = signal<ClassLevel[]>([]);
  sections = signal<ClassSectionItem[]>([]);
  isLoading = signal<boolean>(true);

  formMode = signal<FormMode | null>(null);
  editingId = signal<number | null>(null);
  isSaving = signal<boolean>(false);

  levelForm = { name: '', displayOrder: 1 };
  sectionForm: { classLevelId: number | null; division: string } = { classLevelId: null, division: '' };

  deleteTarget = signal<DeleteTarget | null>(null);
  isDeleting = signal<boolean>(false);

  sectionCounts = computed(() => {
    const counts = new Map<number, number>();
    for (const s of this.sections()) {
      counts.set(s.classLevelId, (counts.get(s.classLevelId) ?? 0) + 1);
    }
    return counts;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    forkJoin({ levels: this.api.getLevels(), sections: this.api.getSections() }).subscribe({
      next: ({ levels, sections }) => {
        this.levels.set(levels);
        this.sections.set(sections);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.showError(err, 'Failed to load classes.');
      }
    });
  }

  openLevelForm(level?: ClassLevel): void {
    const nextOrder = Math.max(0, ...this.levels().map(l => l.displayOrder)) + 1;
    this.levelForm = level
      ? { name: level.name, displayOrder: level.displayOrder }
      : { name: '', displayOrder: nextOrder };
    this.editingId.set(level?.id ?? null);
    this.formMode.set('level');
  }

  openSectionForm(section?: ClassSectionItem): void {
    this.sectionForm = section
      ? { classLevelId: section.classLevelId, division: section.division }
      : { classLevelId: this.levels()[0]?.id ?? null, division: '' };
    this.editingId.set(section?.id ?? null);
    this.formMode.set('section');
  }

  closeForm(): void {
    this.formMode.set(null);
    this.editingId.set(null);
    this.isSaving.set(false);
  }

  saveForm(): void {
    if (this.formMode() === 'level') {
      this.saveLevel();
    } else {
      this.saveSection();
    }
  }

  private saveLevel(): void {
    const name = this.levelForm.name.trim();
    const order = Number(this.levelForm.displayOrder);
    if (!name) {
      this.toast.show('Please enter a class name.', 'error');
      return;
    }
    if (!Number.isInteger(order) || order < 1) {
      this.toast.show('Display order must be a whole number of 1 or more.', 'error');
      return;
    }

    const id = this.editingId();
    const request = { name, displayOrder: order };
    const call = id ? this.api.updateLevel(id, request) : this.api.createLevel(request);

    this.isSaving.set(true);
    call.subscribe({
      next: () => {
        this.toast.show(id ? 'Class updated successfully.' : 'Class created successfully.');
        this.closeForm();
        this.load();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Failed to save class.');
      }
    });
  }

  private saveSection(): void {
    const classLevelId = this.sectionForm.classLevelId;
    const division = this.sectionForm.division.trim();
    if (!classLevelId) {
      this.toast.show('Please select a class.', 'error');
      return;
    }
    if (!division) {
      this.toast.show('Please enter a section name.', 'error');
      return;
    }

    const id = this.editingId();
    const request = { classLevelId: Number(classLevelId), division };
    const call = id ? this.api.updateSection(id, request) : this.api.createSection(request);

    this.isSaving.set(true);
    call.subscribe({
      next: () => {
        this.toast.show(id ? 'Section updated successfully.' : 'Section created successfully.');
        this.closeForm();
        this.load();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.showError(err, 'Failed to save section.');
      }
    });
  }

  requestDeleteLevel(level: ClassLevel): void {
    this.deleteTarget.set({ kind: 'level', id: level.id, label: level.name });
  }

  requestDeleteSection(section: ClassSectionItem): void {
    this.deleteTarget.set({ kind: 'section', id: section.id, label: section.displayName });
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
    this.isDeleting.set(false);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.isDeleting.set(true);
    const call = target.kind === 'level' ? this.api.deleteLevel(target.id) : this.api.deleteSection(target.id);
    call.subscribe({
      next: () => {
        this.toast.show(`${target.label} deleted successfully.`);
        this.cancelDelete();
        this.load();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toast.showError(err, `Failed to delete ${target.label}.`);
      }
    });
  }
}
