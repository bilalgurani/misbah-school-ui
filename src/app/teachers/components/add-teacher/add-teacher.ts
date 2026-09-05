import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TeacherService } from '../../teacher.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  selector: 'app-add-teacher',
  styleUrl: './add-teacher.scss',
  templateUrl: './add-teacher.html',
})
export class AddTeacher implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private teacherService = inject(TeacherService);
    private toast = inject(ToastService);

  teacherForm!: FormGroup;
  isSubmitting = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  teacherId = signal<string | null>(null);

  ngOnInit(): void {
    this.initForm();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.teacherId.set(id);
      this.isEditMode.set(true);
      this.loadTeacherData(id);
    }
  }

  private initForm(): void {
    this.teacherForm = this.fb.group({
      name: ['', Validators.required],
    email: [''],
    phoneNo: ['', Validators.required],
    dob: [''],
    address: [''],
    subjectSpecialization: ['', Validators.required],
    qualification: [''],
    dateOfJoining: ['', Validators.required],
    employmentStatus: ['ACTIVE', Validators.required]
    });
  }

  private loadTeacherData(id: string): void {
    this.teacherService.getTeacherById(id).subscribe({
      next: (teacher) => this.teacherForm.patchValue(teacher),
      error: (err) => this.toast.show('Error fetching teacher data:', err)
    });
  }

  onSubmit(): void {
    if (this.teacherForm.invalid) {
      this.teacherForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formData = this.teacherForm.value;
    const id = this.teacherId();

    if (this.isEditMode() && id) {
      this.teacherService.updateTeacher(id, formData).subscribe({
        next: () => this.handleSuccess(),
        error: (err) => {
          this.toast.show('Update failed:', err);
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.teacherService.createTeacher(formData).subscribe({
        next: () => this.handleSuccess(),
        error: (err) => {
          this.toast.show('Creation failed:', err);
          this.isSubmitting.set(false);
        }
      });
    }
  }

  private handleSuccess(): void {
    this.isSubmitting.set(false);
    this.router.navigate(['/teachers']);
  }
}
