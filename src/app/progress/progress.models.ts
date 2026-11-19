export type CriterionCategory = 'LIFE_SKILLS' | 'VALUES' | 'PARTICIPATION';

export interface Criterion {
  id: number;
  category: CriterionCategory;
  name: string;
  sortOrder: number;
}

// Admin view of a criterion: includes deactivated ones and how many saved ratings use it.
export interface ManagedCriterion extends Criterion {
  active: boolean;
  ratingCount: number;
}

export interface CriterionRating {
  criterionId: number;
  rating: number;
}

export interface StudentAssessment {
  studentId: number;
  academicYearId: number;
  term: number;
  ratings: CriterionRating[];
  remark: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface SaveAssessmentRequest {
  studentId: number;
  academicYearId: number;
  term: number;
  ratings: CriterionRating[];
  remark: string | null;
}

export interface CriteriaGroup {
  category: CriterionCategory;
  label: string;
  criteria: Criterion[];
}

export const TERMS = [1, 2, 3] as const;
export const RATINGS = [1, 2, 3, 4, 5] as const;
export const REMARK_MAX_LENGTH = 500;

export const RATING_LABELS: Record<number, string> = {
  5: 'Outstanding',
  4: 'Very good',
  3: 'Good',
  2: 'Satisfactory',
  1: 'Needs improvement',
};

export const CATEGORY_LABELS: Record<CriterionCategory, string> = {
  LIFE_SKILLS: 'Life skills',
  VALUES: 'Values',
  PARTICIPATION: 'Participation',
};

export const CATEGORY_ORDER: CriterionCategory[] = ['LIFE_SKILLS', 'VALUES', 'PARTICIPATION'];

export const CRITERION_NAME_MAX_LENGTH = 100;

export function groupCriteria(criteria: Criterion[]): CriteriaGroup[] {
  return CATEGORY_ORDER
    .map(category => ({
      category,
      label: CATEGORY_LABELS[category],
      criteria: criteria.filter(c => c.category === category).sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .filter(group => group.criteria.length > 0);
}

export function ratingMap(assessment: Pick<StudentAssessment, 'ratings'> | null | undefined): Map<number, number> {
  return new Map((assessment?.ratings ?? []).map(r => [r.criterionId, r.rating]));
}

export function averageRating(criteria: Criterion[], ratings: Map<number, number>): number | null {
  const values = criteria.map(c => ratings.get(c.id)).filter((v): v is number => v !== undefined);
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export type CompletionState = 'done' | 'partial' | 'pending';

export function completionState(criteria: Criterion[], assessment: StudentAssessment | undefined): CompletionState {
  if (!assessment) return 'pending';
  const rated = ratingMap(assessment);
  const ratedCount = criteria.filter(c => rated.has(c.id)).length;
  if (criteria.length > 0 && ratedCount === criteria.length) return 'done';
  return ratedCount > 0 || !!assessment.remark?.trim() ? 'partial' : 'pending';
}
