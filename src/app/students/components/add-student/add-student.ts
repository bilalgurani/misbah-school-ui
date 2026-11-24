import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StudentService } from '../../student.service';
import { ToastService } from '../../../shared/services/toast.service';
import { AttendanceApiService } from '../../../attendance/services/attendance-api.service';
import { ClassSection } from '../../../attendance/models/attendance.models';
import { ClassApiService } from '../../../classes/services/class-api.service';
import { ClassLevel, SectionSeats, isSectionFull, seatsText } from '../../../classes/models/class.models';
import { EnrollmentService } from '../../../academics/services/enrollment.service';
import { LoaderComponent } from '../../../shared/component/loader.component';

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LoaderComponent],
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
  private attendanceApi = inject(AttendanceApiService);
  private classApi = inject(ClassApiService);
  private enrollmentService = inject(EnrollmentService);

  studentForm!: FormGroup;
  classSections = signal<ClassSection[]>([]);
  classLevels = signal<ClassLevel[]>([]);
  sectionsLoaded = signal<boolean>(false);

  seats = signal<Map<number, SectionSeats>>(new Map());
  selectedSectionId = signal<number | null>(null);
  // In edit mode the student's own section is never "full" for them, because they already hold a seat in it.
  originalSectionId = signal<number | null>(null);
  isRaisingSeats = signal<boolean>(false);
  newCapacity = signal<number | null>(null);
  isSavingSeats = signal<boolean>(false);

  selectedSeats = computed(() => {
    const id = this.selectedSectionId();
    return id === null ? undefined : this.seats().get(id);
  });
  selectedSectionName = computed(() =>
    this.classSections().find(s => s.id === this.selectedSectionId())?.displayName ?? '');

  // A student must belong to a section, so classes without one can't be chosen yet.
  classesWithoutSections = computed(() => {
    const withSections = new Set(this.classSections().map(s => s.levelName));
    return this.classLevels().filter(l => !withSections.has(l.name)).map(l => l.name);
  });
  isSubmitting = signal<boolean>(false);
  isLoadingData = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  studentId = signal<string | null>(null);

  ngOnInit(): void {
    this.initForm();
    this.loadClassSections();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.studentId.set(id);
      this.isEditMode.set(true);
      this.loadStudentData(id);
    }
  }

  private loadClassSections(): void {
    this.attendanceApi.getClassSections().subscribe({
      next: (sections) => {
        this.classSections.set(sections);
        this.sectionsLoaded.set(true);
      },
      error: (err) => this.toast.showError(err, 'Failed to load classes')
    });
    // Only used for the hint below the dropdown, so a failure here is not worth a toast.
    this.classApi.getLevels().subscribe({ next: (levels) => this.classLevels.set(levels) });
    this.loadSeats();
  }

  // Seat counts are optional extras: without them the form still works and the server still enforces the limit.
  private loadSeats(): void {
    this.classApi.getSeats().subscribe({
      next: (seats) => this.seats.set(new Map(seats.map(s => [s.classSectionId, s]))),
      error: () => this.seats.set(new Map()),
    });
  }

  seatLabel(sectionId: number): string {
    const text = seatsText(this.seats().get(sectionId));
    return text ? ` (${text})` : '';
  }

  // True when saving would need a seat in a section that has none free.
  blockedByFullSection(): boolean {
    const takesSeat = this.studentForm?.get('enrollmentStatus')?.value === 'ACTIVE';
    const staysPut = this.isEditMode() && this.selectedSectionId() === this.originalSectionId();
    return takesSeat && !staysPut && isSectionFull(this.selectedSeats());
  }

  startRaisingSeats(): void {
    const capacity = this.selectedSeats()?.capacity ?? 0;
    this.newCapacity.set(capacity + 1);
    this.isRaisingSeats.set(true);
  }

  saveNewCapacity(): void {
    const sectionId = this.selectedSectionId();
    const capacity = Number(this.newCapacity());
    if (sectionId === null || !Number.isInteger(capacity) || capacity < 1) {
      this.toast.show('Enter the new number of seats as a whole number of 1 or more.', 'error');
      return;
    }
    this.isSavingSeats.set(true);
    this.classApi.updateCapacity(sectionId, capacity).subscribe({
      next: () => {
        this.isSavingSeats.set(false);
        this.isRaisingSeats.set(false);
        this.toast.show('Seats updated.');
        this.loadSeats();
      },
      error: (err) => {
        this.isSavingSeats.set(false);
        this.toast.showError(err, 'Failed to update the seats.');
      },
    });
  }

  // A new student gets the next free roll number in the chosen section, unless one was already typed.
  private suggestRollNo(sectionId: number): void {
    const rollControl = this.studentForm.get('rollNo');
    if (this.isEditMode() || !rollControl || String(rollControl.value ?? '').trim()) return;
    this.enrollmentService.getNextRollNo(sectionId).subscribe({
      next: ({ rollNo }) => {
        if (this.selectedSectionId() === sectionId && !String(rollControl.value ?? '').trim()) {
          rollControl.setValue(String(rollNo));
        }
      },
    });
  }

  private initForm(): void {
    this.studentForm = this.fb.group({
      name: ['', Validators.required],
      rollNo: ['', [Validators.required, Validators.pattern(/\S/)]],
      satsNo: [''],
      gender: ['', Validators.required],
      fatherName: ['', Validators.required],
      fatherOccupation: ['', Validators.maxLength(100)],
      motherName: ['', Validators.required],
      dob: ['', Validators.required],
      aadharNo: ['', Validators.pattern('^[0-9]{12}$')], // Updated to 12 digits for Aadhaar
      address: [''],
      mobileNo: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      dateOfAdmission: [''],
      emergencyContactName: [''],
      emergencyContactNo: [''],
      enrollmentStatus: ['ACTIVE', Validators.required],
      classSectionId: [null, Validators.required],
      bloodGroup: ['']
    });

    this.studentForm.get('classSectionId')?.valueChanges.subscribe((value) => {
      const id = value === null || value === '' ? null : Number(value);
      this.selectedSectionId.set(id);
      this.isRaisingSeats.set(false);
      if (id !== null) this.suggestRollNo(id);
    });
  }

  private loadStudentData(id: string): void {
    this.isLoadingData.set(true);
    this.studentService.getStudentById(id).subscribe({
      next: (student) => {
        this.isLoadingData.set(false);
        // Remove spaces and non-digit characters from numerical fields upon loading
        const sanitizedData = {
          ...student,
          aadharNo: student.aadharNo ? student.aadharNo.replace(/\s+/g, '') : '',
          mobileNo: student.mobileNo ? student.mobileNo.replace(/\D/g, '').slice(-10) : '',
          emergencyContactNo: student.emergencyContactNo ? student.emergencyContactNo.replace(/\D/g, '').slice(-10) : ''
        };

        this.studentForm.patchValue(sanitizedData);
        this.originalSectionId.set(student.classSectionId ?? null);
        
        if (this.studentForm.invalid) {
          this.logInvalidControls();
        }
      },
      error: (err) => {
        this.isLoadingData.set(false);
        this.toast.showError(err, 'Failed to load student data.');
      }
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

    if (!rawValue['fatherOccupation']) rawValue['fatherOccupation'] = null;

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
        next: () => {
          this.handleSuccess();
          this.toast.show('Student updated successfully');
        },
        error: (err) => {
          this.toast.showError(err, 'Failed to update student.');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.studentService.createStudent(formData).subscribe({
        next: () => {
          this.handleSuccess();
          this.toast.show('Student created successfully');
        },
        error: (err) => {
          this.toast.showError(err, 'Failed to create student.');
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