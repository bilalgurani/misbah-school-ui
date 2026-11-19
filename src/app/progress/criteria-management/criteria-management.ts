import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmDialogComponent } from '../../shared/component/confirm-dialog.component';
import { LoaderComponent } from '../../shared/component/loader.component';
import { ToastService } from '../../shared/services/toast.service';
import {
  CATEGORY_LABELS, CATEGORY_ORDER, CRITERION_NAME_MAX_LENGTH, CriterionCategory, ManagedCriterion,
} from '../progress.models';
import { ProgressService } from '../progress.service';

interface CategoryBlock {
  category: CriterionCategory;
  label: string;
  items: ManagedCriterion[];
}

@Component({
  selector: 'app-criteria-management',
  imports: [FormsModule, LoaderComponent, ConfirmDialogComponent],
  templateUrl: './criteria-management.html',
  styleUrl: './criteria-management.scss',
})
export class CriteriaManagement implements OnInit {
  private progress = inject(ProgressService);
  private toast = inject(ToastService);

  readonly nameMax = CRITERION_NAME_MAX_LENGTH;

  criteria = signal<ManagedCriterion[]>([]);
  isLoading = signal(true);
  loadFailed = signal(false);
  isBusy = signal(false);

  newNames = signal<Record<CriterionCategory, string>>({ LIFE_SKILLS: '', VALUES: '', PARTICIPATION: '' });
  editingId = signal<number | null>(null);
  editName = signal('');
  toDelete = signal<ManagedCriterion | null>(null);

  blocks = computed<CategoryBlock[]>(() =>
    CATEGORY_ORDER.map(category => ({
      category,
      label: CATEGORY_LABELS[category],
      items: this.criteria().filter(c => c.category === category).sort((a, b) => a.sortOrder - b.sortOrder),
    })),
  );

  hasAny = computed(() => this.criteria().length > 0);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.progress.getAllCriteria().subscribe({
      next: list => {
        this.criteria.set(list);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.loadFailed.set(true);
        this.toast.showError(err, 'Failed to load the criteria.');
      },
    });
  }

  setNewName(category: CriterionCategory, value: string): void {
    this.newNames.update(names => ({ ...names, [category]: value }));
  }

  add(category: CriterionCategory): void {
    const name = this.newNames()[category].trim();
    if (!name || this.isBusy()) return;

    this.isBusy.set(true);
    this.progress.createCriterion(category, name).subscribe({
      next: () => {
        this.isBusy.set(false);
        this.setNewName(category, '');
        this.toast.show(`Added "${name}".`);
        this.load();
      },
      error: err => {
        this.isBusy.set(false);
        this.toast.showError(err, 'Failed to add the criterion.');
      },
    });
  }

  startEdit(item: ManagedCriterion): void {
    this.editingId.set(item.id);
    this.editName.set(item.name);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(item: ManagedCriterion): void {
    const name = this.editName().trim();
    if (!name || this.isBusy()) return;
    if (name === item.name) {
      this.cancelEdit();
      return;
    }
    this.update(item, { name }, 'Renamed.');
  }

  toggleActive(item: ManagedCriterion): void {
    this.update(item, { active: !item.active }, item.active ? 'Deactivated.' : 'Activated.');
  }

  private update(item: ManagedCriterion, changes: { name?: string; active?: boolean }, message: string): void {
    this.isBusy.set(true);
    this.progress.updateCriterion(item.id, changes).subscribe({
      next: updated => {
        this.isBusy.set(false);
        this.editingId.set(null);
        this.criteria.update(list => list.map(c => (c.id === updated.id ? updated : c)));
        this.toast.show(message);
      },
      error: err => {
        this.isBusy.set(false);
        this.toast.showError(err, 'Failed to update the criterion.');
      },
    });
  }

  confirmDelete(): void {
    const item = this.toDelete();
    if (!item) return;
    this.isBusy.set(true);
    this.progress.deleteCriterion(item.id).subscribe({
      next: () => {
        this.isBusy.set(false);
        this.toDelete.set(null);
        this.criteria.update(list => list.filter(c => c.id !== item.id));
        this.toast.show(`Deleted "${item.name}".`);
      },
      error: err => {
        this.isBusy.set(false);
        this.toDelete.set(null);
        this.toast.showError(err, 'Failed to delete the criterion.');
      },
    });
  }
}
