import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StudentService } from '../../student.service';
import { ToastService } from '../../../shared/services/toast.service';

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
  private toast = inject(ToastService);

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
      aadharNo: ['', Validators.pattern('^[0-9]{12}$')], // Updated to 12 digits for Aadhaar
      address: [''],
      mobileNo: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      dateOfAdmission: [''],
      emergencyContactName: [''],
      emergencyContactNo: [''],
      enrollmentStatus: ['ACTIVE', Validators.required],
      classSectionId: [1],
      bloodGroup: ['']
    });
  }

  private loadStudentData(id: string): void {
    this.studentService.getStudentById(id).subscribe({
      next: (student) => {
        // Remove spaces and non-digit characters from numerical fields upon loading
        const sanitizedData = {
          ...student,
          aadharNo: student.aadharNo ? student.aadharNo.replace(/\s+/g, '') : '',
          mobileNo: student.mobileNo ? student.mobileNo.replace(/\D/g, '').slice(-10) : '',
          emergencyContactNo: student.emergencyContactNo ? student.emergencyContactNo.replace(/\D/g, '').slice(-10) : ''
        };

        this.studentForm.patchValue(sanitizedData);
        
        if (this.studentForm.invalid) {
          this.logInvalidControls();
        }
      },
      error: (err) => this.toast.show('Error fetching student data:', err)
    });
  }

  private logInvalidControls(): void {
    const invalidControls: string[] = [];
    const controls = this.studentForm.controls;
    for (const name in controls) {
      if (controls[name].invalid) {
        invalidControls.push(name);
      }
    }
    console.warn('Form is invalid due to the following controls:', invalidControls);
  }

  /**
   * Trims whitespace from text inputs and strips spaces from strictly numeric ID fields.
   */
  private prepareFormData(): any {
    const rawValue = { ...this.studentForm.value };

    Object.keys(rawValue).forEach((key) => {
      if (typeof rawValue[key] === 'string') {
        // Strip spaces completely for specific numeric/ID fields
        if (['aadharNo', 'mobileNo', 'emergencyContactNo', 'rollNo', 'satsNo'].includes(key)) {
          rawValue[key] = rawValue[key].replace(/\s+/g, '');
        } else {
          // Standard trim for regular text fields
          rawValue[key] = rawValue[key].trim();
        }
      }
    });

    return rawValue;
  }

  onSubmit(): void {
    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formData = this.prepareFormData();
    const id = this.studentId();

    if (this.isEditMode() && id) {
      this.studentService.updateStudent(id, formData).subscribe({
        next: () => this.handleSuccess(),
        error: (err) => {
          this.toast.show('Update failed:', err);
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.studentService.createStudent(formData).subscribe({
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
    this.router.navigate(['/students']);
  }
}