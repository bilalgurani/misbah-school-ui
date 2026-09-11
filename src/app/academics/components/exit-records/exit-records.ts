import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentExitRecord } from '../../models/student-exit.model';
import { StudentExitService } from '../../services/student-exit.service';

@Component({
  selector: 'app-exit-records',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './exit-records.scss',
  templateUrl: './exit-records.html',
})
export class ExitRecords implements OnInit {
  private exitService = inject(StudentExitService);

  allExitRecords = signal<StudentExitRecord[]>([]);
  filteredRecords = signal<StudentExitRecord[]>([]);
  isLoading = signal<boolean>(true);
  searchTerm = signal<string>('');

  ngOnInit(): void {
    this.loadAllExitRecords();
  }

  loadAllExitRecords(): void {
    this.isLoading.set(true);
    this.exitService.getAllExitRecords().subscribe({
      next: (records) => {
        this.allExitRecords.set(records);
        this.filteredRecords.set(records);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load exit records:', err);
        this.isLoading.set(false);
      }
    });
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
    const query = term.toLowerCase().trim();
    
    if (!query) {
      this.filteredRecords.set(this.allExitRecords());
      return;
    }

    const filtered = this.allExitRecords().filter((record) =>
      record.studentName?.toLowerCase().includes(query) ||
      record.academicYearName?.toLowerCase().includes(query) ||
      record.tcNumber?.toLowerCase().includes(query) ||
      record.reasonCategory?.toLowerCase().includes(query) ||
      record.recordedByUserName?.toLowerCase().includes(query)
    );
    this.filteredRecords.set(filtered);
  }
}