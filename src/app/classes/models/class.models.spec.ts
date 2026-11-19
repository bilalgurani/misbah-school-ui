import { isSectionFull, seatsLeft, seatsText } from './class.models';

describe('seat helpers', () => {
  const seats = (capacity: number | null, studentCount: number) => ({ classSectionId: 1, capacity, studentCount });

  it('counts the free seats and treats a section without a limit as never full', () => {
    expect(seatsLeft(seats(40, 32))).toBe(8);
    expect(seatsLeft(seats(null, 32))).toBeNull();
    expect(isSectionFull(seats(null, 500))).toBe(false);
    expect(isSectionFull(seats(40, 40))).toBe(true);
  });

  it('never reports negative seats when a section was lowered below its students', () => {
    expect(seatsLeft(seats(30, 35))).toBe(0);
    expect(isSectionFull(seats(30, 35))).toBe(true);
  });

  it('describes seats in plain words for dropdowns', () => {
    expect(seatsText(seats(40, 39))).toBe('1 seat left');
    expect(seatsText(seats(40, 30))).toBe('10 seats left');
    expect(seatsText(seats(40, 40))).toBe('Full');
    expect(seatsText(seats(null, 12))).toBe('12 students');
    expect(seatsText(undefined)).toBe('');
  });
});
