import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { HeaderSearch } from './header-search';

function setup(role: 'ADMIN' | 'TEACHER') {
  localStorage.setItem('role', role);
  TestBed.configureTestingModule({
    imports: [HeaderSearch],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(HeaderSearch);
  return { search: fixture.componentInstance, http: TestBed.inject(HttpTestingController), router: TestBed.inject(Router) };
}

describe('HeaderSearch', () => {
  afterEach(() => localStorage.removeItem('role'));

  it('only offers pages the signed-in role can open', () => {
    const admin = setup('ADMIN').search;
    admin.onInput('collect fee');
    expect(admin.hits().map(h => h.label)).toContain('Collect Fee');

    TestBed.resetTestingModule();
    const teacher = setup('TEACHER').search;
    teacher.onInput('collect fee');
    expect(teacher.hits()).toEqual([]);
  });

  it('loads students once, matches name or roll number, and opens their attendance history', () => {
    const { search, http, router } = setup('ADMIN');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    search.onFocus();
    search.onFocus();
    http.expectOne(`${environment.apiUrl}/students`).flush([
      { id: 7, name: 'Ayesha Khan', rollNo: 12, classSectionId: 'Class 3 A' },
      { id: 8, name: 'Bilal Shaikh', rollNo: 5, classSectionId: 'Class 1 B' },
    ]);

    search.onInput('ayesha');
    expect(search.hits().map(h => h.label)).toEqual(['Ayesha Khan']);
    search.onInput('class 1 5');
    expect(search.hits().map(h => h.label)).toEqual(['Bilal Shaikh']);

    search.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(navigate).toHaveBeenCalledWith(['/reports/attendance/student'], { queryParams: { studentId: 8 } });
    expect(search.query()).toBe('');
    http.verify();
  });

  it('keeps pages working when the student list fails to load', () => {
    const { search, http } = setup('ADMIN');
    search.onFocus();
    http.expectOne(`${environment.apiUrl}/students`).flush('error', { status: 500, statusText: 'Server Error' });

    search.onInput('holidays');
    expect(search.studentState()).toBe('failed');
    expect(search.hits().map(h => h.label)).toContain('Holidays');
  });
});
