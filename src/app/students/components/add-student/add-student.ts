import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StudentService } from '../../student.service';

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  selector: 'app-add-student',
  styleUrl: './add-student.scss',
  templateUrl: './add-student.html',
})
export class AddStudent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private studentService = inject(StudentService);

  studentForm!: FormGroup;
  isSubmitting = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  studentId = signal<string | null>(null);

  ngOnInit(): void {
    this.initForm();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.studentId.set(id);
      this.isEditMode.set(true);
      this.loadStudentData(id);
    }
  }

  private initForm(): void {
    this.studentForm = this.fb.group({
      name: ['', Validators.required],
      rollNo: [''],
      satsNo: [''],
      gender: ['', Validators.required],
      fatherName: ['', Validators.required],
      motherName: ['', Validators.required],
      dob: ['', Validators.required],
      aadharNo: [''],
      address: [''],
      mobileNo: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      dateOfAdmission: [''],
      emergencyContactName: [''],
      emergencyContactNo: [''],
      enrollmentStatus: ['ACTIVE', Validators.required],
      classSectionId: [1, Validators.required],
      bloodGroup: ['']
    });
  }

  private loadStudentData(id: string): void {
    this.studentService.getStudentById(id).subscribe({
      next: (student) => this.studentForm.patchValue(student),
      error: (err) => console.error('Error fetching student data:', err)
    });
  }

  onSubmit(): void {
    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formData = this.studentForm.value;
    const id = this.studentId();

    if (this.isEditMode() && id) {
      this.studentService.updateStudent(id, formData).subscribe({
        next: () => this.handleSuccess(),
        error: (err) => {
          console.error('Update failed:', err);
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.studentService.createStudent(formData).subscribe({
        next: () => this.handleSuccess(),
        error: (err) => {
          console.error('Creation failed:', err);
          this.isSubmitting.set(false);
        }
      });
    }
  }

  private handleSuccess(): void {
    this.isSubmitting.set(false);
    this.router.navigate(['/students']);
  }
}
