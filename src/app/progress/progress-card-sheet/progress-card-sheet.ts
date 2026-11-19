import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { trendFromMonths } from '../../attendance/attendance-trend.util';
import { ReportCardExam } from '../../exams/exam.service';
import { AttendanceTrendComponent } from '../../shared/component/attendance-trend.component';
import { DEFAULT_SCHOOL_NAME, ProgressCardData } from '../progress-card.data';
import {
  Criterion, RATINGS, RATING_LABELS, averageRating, groupCriteria, ratingMap,
} from '../progress.models';

/** One printable holistic progress card. Used by the single-student page and the whole-class page. */
@Component({
  selector: 'app-progress-card-sheet',
  imports: [DatePipe, DecimalPipe, AttendanceTrendComponent],
  templateUrl: './progress-card-sheet.html',
  styleUrl: './progress-card-sheet.scss',
})
export class ProgressCardSheet {
  readonly data = input.required<ProgressCardData>();
  readonly criteria = input<Criterion[]>([]);

  readonly scale = [...RATINGS].reverse();
  readonly ratingLabels = RATING_LABELS;
  readonly schoolFallback = DEFAULT_SCHOOL_NAME;

  mainExams = computed<ReportCardExam[]>(() => (this.data().academics?.exams ?? []).filter(e => e.examType !== 'IA'));

  skillGroups = computed(() => {
    const ratings = ratingMap(this.data().assessment);
    return groupCriteria(this.criteria()).map(group => ({
      label: group.label,
      average: averageRating(group.criteria, ratings),
      items: group.criteria.map(c => ({ name: c.name, rating: ratings.get(c.id) ?? null })),
    }));
  });

  attendanceTrend = computed(() => trendFromMonths(this.data().attendance?.months ?? []).trend);

  isPending(exam: ReportCardExam): boolean {
    return exam.result === 'INCOMPLETE';
  }

  dots(rating: number | null): boolean[] {
    return RATINGS.map(r => rating !== null && r <= rating);
  }
}
