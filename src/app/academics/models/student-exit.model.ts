export interface StudentExitRequestDto {
  currentEnrollmentId?: number;
  academicYearId: number;
  exitDate: string;
  exitType: 'TRANSFERRED_OUT' | 'DROPPED_OUT' | string;
  reasonCategory: 'FAMILY_RELOCATION' | 'ACADEMIC' | 'FINANCIAL' | 'PERSONAL' | 'OTHER' | string;
  reasonNotes?: string;
  destinationSchool?: string;
  tcNumber?: string;
  tcIssuedOn?: string;
}

export interface StudentExitRecord extends StudentExitRequestDto {
  id: number;
  studentId: number;
  studentName?: string;
  academicYearName?: string;
  recordedByUserId?: number;
  recordedByUserName?: string;
  createdAt?: string;
}