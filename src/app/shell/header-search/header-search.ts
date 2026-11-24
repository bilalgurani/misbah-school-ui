import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { StudentService } from '../../students/student.service';
import { NAV_GROUPS, NAV_TOP_LINKS } from '../shell-nav';

const MIN_CHARS = 2;
const MAX_PAGES = 5;
const MAX_STUDENTS = 6;
// The student list is fetched once and reused; it is refreshed when the box is used again after this long.
const STUDENTS_MAX_AGE_MS = 5 * 60_000;

interface PageEntry { label: string; detail: string; path: string; haystack: string; }
interface StudentEntry { id: number; label: string; detail: string; haystack: string; }

export interface SearchHit {
  kind: 'page' | 'student';
  key: string;
  label: string;
  detail: string;
  go: () => void;
}

const words = (text: string) => text.toLowerCase().split(/\s+/).filter(Boolean);
const matchesAll = (haystack: string, terms: string[]) => terms.every(t => haystack.includes(t));

function toStudentEntry(s: any): StudentEntry {
  const name = String(s.name ?? [s.firstName, s.lastName].filter(Boolean).join(' '));
  const rollNo = s.rollNo === null || s.rollNo === undefined ? '' : String(s.rollNo);
  const className = String(s.classSectionName ?? s.className ?? s.classSectionId ?? '');
  const detail = [rollNo && `Roll ${rollNo}`, className].filter(Boolean).join(' · ');
  return { id: s.id, label: name, detail, haystack: `${name} ${rollNo} ${className}`.toLowerCase() };
}

/**
 * Header search: jumps to a page from the menu or to a student's attendance history.
 * Pages come from the menu (so people only see what their role can open); students are loaded the
 * first time the box is used and filtered in the browser, like the student directory does.
 */
@Component({
  selector: 'app-header-search',
  templateUrl: './header-search.html',
  styleUrl: './header-search.scss',
  host: {
    '(document:keydown)': 'onGlobalKey($event)',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class HeaderSearch {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly studentService = inject(StudentService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  readonly query = signal('');
  readonly open = signal(false);
  // On a phone the search is an icon that opens a full-width bar over the header.
  readonly expanded = signal(false);
  readonly active = signal(0);

  private readonly students = signal<StudentEntry[]>([]);
  readonly studentState = signal<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  private studentsLoadedAt = 0;

  private readonly pages = computed<PageEntry[]>(() => {
    const allowed = (role?: string) => !role || (role === 'ADMIN' ? this.auth.isAdmin() : this.auth.isTeacher());
    const top = NAV_TOP_LINKS.filter(l => allowed(l.role)).map(l => ({ label: l.label, detail: '', path: l.path }));
    const grouped = NAV_GROUPS.flatMap(g =>
      g.items.filter(i => allowed(i.role)).map(i => ({ label: i.label, detail: g.label, path: i.path })));
    return [...top, ...grouped].map(p => ({ ...p, haystack: `${p.label} ${p.detail}`.toLowerCase() }));
  });

  readonly hits = computed<SearchHit[]>(() => {
    const q = this.query().trim();
    if (q.length < MIN_CHARS) return [];
    const terms = words(q);

    const pageHits = this.pages()
      .filter(p => matchesAll(p.haystack, terms))
      .slice(0, MAX_PAGES)
      .map<SearchHit>(p => ({
        kind: 'page', key: `p:${p.path}`, label: p.label, detail: p.detail,
        go: () => void this.router.navigateByUrl(p.path),
      }));

    const studentHits = this.students()
      .filter(s => matchesAll(s.haystack, terms))
      .slice(0, MAX_STUDENTS)
      .map<SearchHit>(s => ({
        kind: 'student', key: `s:${s.id}`, label: s.label, detail: s.detail,
        go: () => void this.router.navigate(['/reports/attendance/student'], { queryParams: { studentId: s.id } }),
      }));

    return [...pageHits, ...studentHits];
  });

  readonly showPanel = computed(() => this.open() && this.query().trim().length >= MIN_CHARS);

  onFocus(): void {
    this.open.set(true);
    this.loadStudents();
  }

  onInput(value: string): void {
    this.query.set(value);
    this.active.set(0);
    this.open.set(true);
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.hits().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.open.set(true);
        if (count) this.active.set((this.active() + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) this.active.set((this.active() - 1 + count) % count);
        break;
      case 'Enter': {
        const hit = this.hits()[this.active()];
        if (hit) {
          event.preventDefault();
          this.choose(hit);
        }
        break;
      }
      case 'Escape':
        if (this.query()) this.query.set('');
        else this.collapse();
        this.open.set(false);
        break;
    }
  }

  choose(hit: SearchHit): void {
    hit.go();
    this.query.set('');
    this.open.set(false);
    this.expanded.set(false);
    this.field()?.nativeElement.blur();
  }

  expand(): void {
    this.expanded.set(true);
    // The input only becomes visible after this change renders.
    setTimeout(() => this.field()?.nativeElement.focus());
  }

  collapse(): void {
    this.expanded.set(false);
    this.open.set(false);
    this.query.set('');
  }

  // "/" jumps to the search box from anywhere, unless the person is already typing in a field.
  onGlobalKey(event: KeyboardEvent): void {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    event.preventDefault();
    this.expanded.set(true);
    setTimeout(() => this.field()?.nativeElement.focus());
  }

  onDocumentClick(event: MouseEvent): void {
    if (this.host.nativeElement.contains(event.target as Node)) return;
    this.open.set(false);
    if (!this.query()) this.expanded.set(false);
  }

  private loadStudents(): void {
    const state = this.studentState();
    if (state === 'loading') return;
    if (state === 'ready' && Date.now() - this.studentsLoadedAt < STUDENTS_MAX_AGE_MS) return;

    this.studentState.set('loading');
    this.studentService.getStudents().subscribe({
      next: list => {
        this.students.set((list ?? []).map(toStudentEntry));
        this.studentsLoadedAt = Date.now();
        this.studentState.set('ready');
      },
      // Pages still work without the student list; the next time the box is used it tries again.
      error: () => this.studentState.set('failed'),
    });
  }
}
