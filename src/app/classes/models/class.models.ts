export interface ClassLevel {
  id: number;
  name: string;
  displayOrder: number;
}

export interface ClassSectionItem {
  id: number;
  classLevelId: number;
  levelName: string;
  division: string;
  displayName: string;
}

export interface ClassLevelRequest {
  name: string;
  displayOrder: number;
}

export interface ClassSectionRequest {
  classLevelId: number;
  division: string;
  // Used when creating a section. To change the limit later, use updateCapacity.
  capacity?: number | null;
}

// Live seat count for a section. capacity is null when the section has no limit.
export interface SectionSeats {
  classSectionId: number;
  capacity: number | null;
  studentCount: number;
}

export function seatsLeft(seats: SectionSeats | undefined): number | null {
  if (!seats || seats.capacity === null) return null;
  return Math.max(0, seats.capacity - seats.studentCount);
}

export function isSectionFull(seats: SectionSeats | undefined): boolean {
  return seatsLeft(seats) === 0;
}

// Short text for dropdowns, for example "8 seats left", "Full" or "32 students".
export function seatsText(seats: SectionSeats | undefined): string {
  if (!seats) return '';
  const left = seatsLeft(seats);
  if (left === null) return `${seats.studentCount} ${seats.studentCount === 1 ? 'student' : 'students'}`;
  if (left === 0) return 'Full';
  return `${left} ${left === 1 ? 'seat' : 'seats'} left`;
}
