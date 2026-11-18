import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type ExamResultStatus = 'PASS' | 'FAIL' | 'INCOMPLETE';

export interface ClassLevel {
  id: number;
  name: string;
}

export interface ExamClassSection {
  id: number;
  classLevelId?: number | null;
  levelName?: string;
  division?: string;
  displayName: string;
}

export interface Subject {
  id: number;
  name: string;
}

export type ExamType = 'IA' | 'MAIN';
export type IaAggregation = 'AVERAGE' | 'BEST';

export interface Exam {
  id: number;
  academicYearId: number;
  academicYear: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  examType: ExamType;
  iaAggregation: IaAggregation;
  iaExamIds: number[];
}

export interface CreateExamRequest {
  academicYearId?: number | null;
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  examType?: ExamType;
  iaAggregation?: IaAggregation;
  iaExamIds?: number[];
}

export interface SaveIaLinksRequest {
  iaAggregation: IaAggregation;
  iaExamIds: number[];
}

export interface ExamSubject {
  id: number;
  classLevelId: number;
  classLevelName: string;
  subjectId: number;
  subjectName: string;
  maxMarks: number;
  passMarks: number;
  iaMaxMarks: number;
}

export interface ExamSubjectItem {
  subjectId: number;
  maxMarks: number;
  passMarks: number;
  iaMaxMarks?: number;
}

export interface SaveExamSubjectsRequest {
  classLevelId: number;
  items: ExamSubjectItem[];
}

export interface MarksStudent {
  studentId: number;
  rollNo: number | string | null;
  name: string;
  marks: number | null;
  absent: boolean;
}

export interface MarksSheet {
  examSubjectId: number;
  examId: number;
  subjectId: number;
  subjectName: string;
  maxMarks: number;
  passMarks: number;
  classSectionId: number;
  className: string;
  students: MarksStudent[];
}

export interface MarksEntryItem {
  studentId: number;
  marks: number | null;
  absent: boolean;
}

export interface SaveMarksRequest {
  classSectionId: number;
  subjectId: number;
  entries: MarksEntryItem[];
}

export interface ResultSubject {
  subjectId: number;
  name: string;
  maxMarks: number;
  passMarks: number;
  writtenMax: number;
  iaMax: number;
}

export interface ResultScore {
  subjectId: number;
  marks: number | null;
  absent: boolean;
  grade: string | null;
  iaMarks: number | null;
  writtenMarks: number | null;
}

export interface ResultStudent {
  studentId: number;
  rollNo: number | string | null;
  name: string;
  scores: ResultScore[];
  totalMarks: number;
  totalMax: number;
  percentage: number;
  grade: string | null;
  result: ExamResultStatus;
  rank: number | null;
}

export interface ExamResultSheet {
  examId: number;
  examName: string;
  classSectionId: number;
  className: string;
  subjects: ResultSubject[];
  students: ResultStudent[];
}

export interface ReportCardSubject {
  subjectId: number;
  subject: string;
  maxMarks: number;
  passMarks: number;
  marks: number | null;
  absent: boolean;
  grade: string | null;
  writtenMax: number;
  writtenMarks: number | null;
  iaMax: number;
  iaMarks: number | null;
}

export interface ReportCardExam {
  examId: number;
  examType: ExamType;
  name: string;
  startDate: string | null;
  subjects: ReportCardSubject[];
  totalMarks: number;
  totalMax: number;
  percentage: number;
  grade: string | null;
  result: ExamResultStatus;
  rank: number | null;
  classSize: number;
}

export interface ReportCardOverall {
  totalMarks: number;
  totalMax: number;
  percentage: number;
  grade: string | null;
  result: ExamResultStatus;
}

export interface GradeScaleEntry {
  grade: string;
  minPercentage: number;
}

export interface ReportCardData {
  studentId: number;
  name: string;
  rollNo: number | string | null;
  className: string;
  fatherName: string | null;
  academicYear: string;
  schoolName: string;
  exams: ReportCardExam[];
  overall: ReportCardOverall;
  gradeScale: GradeScaleEntry[];
}

@Injectable({ providedIn: 'root' })
export class ExamService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getClassLevels(): Observable<ClassLevel[]> {
    return this.http.get<ClassLevel[]>(`${this.baseUrl}/class-levels`);
  }

  getClassSections(): Observable<ExamClassSection[]> {
    return this.http.get<ExamClassSection[]>(`${this.baseUrl}/class-sections`);
  }

  getSubjects(): Observable<Subject[]> {
    return this.http.get<Subject[]>(`${this.baseUrl}/subjects`);
  }

  createSubject(name: string): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.baseUrl}/subjects`, { name });
  }

  deleteSubject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/subjects/${id}`);
  }

  getExams(academicYearId?: number | null): Observable<Exam[]> {
    let params = new HttpParams();
    if (academicYearId) params = params.set('academicYearId', academicYearId);
    return this.http.get<Exam[]>(`${this.baseUrl}/exams`, { params });
  }

  createExam(request: CreateExamRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.baseUrl}/exams`, request);
  }

  saveIaLinks(examId: number, request: SaveIaLinksRequest): Observable<Exam> {
    return this.http.put<Exam>(`${this.baseUrl}/exams/${examId}/ia-links`, request);
  }

  deleteExam(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/exams/${id}`);
  }

  getExamSubjects(examId: number, classLevelId?: number | null): Observable<ExamSubject[]> {
    let params = new HttpParams();
    if (classLevelId) params = params.set('classLevelId', classLevelId);
    return this.http.get<ExamSubject[]>(`${this.baseUrl}/exams/${examId}/subjects`, { params });
  }

  saveExamSubjects(examId: number, request: SaveExamSubjectsRequest): Observable<ExamSubject[]> {
    return this.http.put<ExamSubject[]>(`${this.baseUrl}/exams/${examId}/subjects`, request);
  }

  getMarks(examId: number, classSectionId: number, subjectId: number): Observable<MarksSheet> {
    const params = new HttpParams().set('classSectionId', classSectionId).set('subjectId', subjectId);
    return this.http.get<MarksSheet>(`${this.baseUrl}/exams/${examId}/marks`, { params });
  }

  saveMarks(examId: number, request: SaveMarksRequest): Observable<{ saved: number }> {
    return this.http.post<{ saved: number }>(`${this.baseUrl}/exams/${examId}/marks`, request);
  }

  getResults(examId: number, classSectionId: number): Observable<ExamResultSheet> {
    const params = new HttpParams().set('classSectionId', classSectionId);
    return this.http.get<ExamResultSheet>(`${this.baseUrl}/exams/${examId}/results`, { params });
  }

  getReportCard(studentId: number, academicYearId?: number | null): Observable<ReportCardData> {
    let params = new HttpParams();
    if (academicYearId) params = params.set('academicYearId', academicYearId);
    return this.http.get<ReportCardData>(`${this.baseUrl}/report-cards/${studentId}`, { params });
  }
}
