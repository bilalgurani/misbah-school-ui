import { Component, computed, input } from '@angular/core';
import type { ChartConfiguration } from 'chart.js';
import { CHART_COLORS, CHART_PALETTE } from '../../shared/component/chart.component';
import { ChartCardComponent } from '../../shared/component/chart-card.component';
import { ExamResultSheet } from '../exam.service';

@Component({
  selector: 'app-exam-results-charts',
  imports: [ChartCardComponent],
  templateUrl: './exam-results-charts.html',
  styleUrl: './exam-results-charts.scss',
})
export class ExamResultsCharts {
  sheet = input.required<ExamResultSheet>();

  gradeCounts = computed(() => {
    const ranked = [...this.sheet().students]
      .filter(s => s.result !== 'INCOMPLETE' && !!s.grade)
      .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0));
    const counts = new Map<string, number>();
    for (const s of ranked) counts.set(s.grade!, (counts.get(s.grade!) ?? 0) + 1);
    return [...counts.entries()];
  });

  gradeData = computed<ChartConfiguration['data']>(() => {
    const rows = this.gradeCounts();
    return {
      labels: rows.map(([grade]) => grade),
      datasets: [{
        label: 'Students',
        data: rows.map(([, count]) => count),
        backgroundColor: rows.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
        borderRadius: 4,
      }],
    };
  });

  gradeOptions: ChartConfiguration['options'] = {
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Students' } } },
  };

  subjectAverages = computed(() => {
    const data = this.sheet();
    return data.subjects
      .map(sub => {
        const percents: number[] = [];
        for (const st of data.students) {
          const score = st.scores.find(s => s.subjectId === sub.subjectId);
          if (score && !score.absent && score.marks !== null && sub.maxMarks > 0) {
            percents.push((score.marks / sub.maxMarks) * 100);
          }
        }
        const average = percents.length > 0 ? percents.reduce((a, b) => a + b, 0) / percents.length : null;
        return { name: sub.name, average: average === null ? null : Math.round(average * 10) / 10 };
      })
      .filter((s): s is { name: string; average: number } => s.average !== null);
  });

  subjectData = computed<ChartConfiguration['data']>(() => {
    const rows = this.subjectAverages();
    return {
      labels: rows.map(r => r.name),
      datasets: [{
        label: 'Average %',
        data: rows.map(r => r.average),
        backgroundColor: CHART_COLORS.blue,
        borderRadius: 4,
      }],
    };
  });

  subjectOptions: ChartConfiguration['options'] = {
    plugins: { legend: { display: false } },
    scales: { y: { min: 0, max: 100, title: { display: true, text: 'Average %' } } },
  };
}
