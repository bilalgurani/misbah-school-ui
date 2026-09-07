export interface StudentExitRequestDto {
  currentEnrollmentId: number;
  academicYearId: number;
  exitDate: string;
  exitType: 'TRANSFERRED_OUT' | 'DROPPED_OUT';
  reasonCategory: 'FAMILY_RELOCATION' | 'ACADEMIC' | 'FINANCIAL' | 'PERSONAL' | 'OTHER';
  reasonNotes?: string;
  destinationSchool?: string;
  tcNumber?: string;
  tcIssuedOn?: string;
}

export interface StudentExitRecord extends StudentExitRequestDto {
  id: number;
  studentId: number;
  recordedByUserId?: number;
  createdAt?: string;
}