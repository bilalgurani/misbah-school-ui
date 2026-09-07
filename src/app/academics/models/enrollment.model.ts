export interface StudentEnrollment {
  id: number;
  studentId: number;
  academicYearId: number;
  classSectionId: number;
  rollNo: string;
  status: 'ACTIVE' | 'PROMOTED' | 'DETAINED' | 'LEFT' | 'TRANSFERRED_OUT';
  enrolledOn: string;
  statusUpdatedOn?: string;
  classSectionName?: string; // Optional populated display field
}

export interface PromotionItemDto {
  studentId: number;
  currentEnrollmentId: number;
  targetClassSectionId: number;
  targetRollNo: string;
  outcome: 'PROMOTED' | 'DETAINED';
}

export interface PromotionRequestDto {
  targetAcademicYearId: number;
  items: PromotionItemDto[];
}