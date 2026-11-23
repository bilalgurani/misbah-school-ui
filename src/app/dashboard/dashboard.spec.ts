import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../environments/environment';
import { routes } from '../app.routes';
import { AuthService } from '../auth/auth.service';
import { DashboardCharts } from './components/dashboard-charts/dashboard-charts';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideComponent(DashboardCharts, { set: { template: '' } })
      .compileComponents();
  });

  afterEach(() => TestBed.inject(AuthService).forceLocalLogout());

  it('redirects signed-out dashboard visitors to login', async () => {
    await RouterTestingHarness.create('/dashboard');
    expect(TestBed.inject(Router).url).toBe('/login');
    TestBed.inject(HttpTestingController).verify();
  });

  it('uses the normal API login and only mocks dashboard data when configured', async () => {
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).login({ username: 'test-admin', password: 'test-password' }).subscribe();
    const login = http.expectOne(`${environment.apiUrl}/auth/login`);
    expect(login.request.method).toBe('POST');
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 1800 }));
    login.flush({ token: `test.${payload}.test`, username: 'test-admin', role: 'ADMIN' });

    const harness = await RouterTestingHarness.create('/dashboard');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(http.expectOne(`${environment.apiUrl}/auth/user`).request.method).toBe('GET');
    expect(http.expectOne(`${environment.apiUrl}/terms/status`).request.method).toBe('GET');

    if (!environment.mockDashboard) {
      expect(http.expectOne(`${environment.apiUrl}/dashboard/stats`).request.method).toBe('GET');
      expect(http.expectOne(`${environment.apiUrl}/holidays/summary`).request.method).toBe('GET');
      http.verify();
      return;
    }

    const page = harness.routeNativeElement!;
    const charts: DashboardCharts = harness.routeDebugElement!.query(By.directive(DashboardCharts)).componentInstance;
    const stats = charts.stats();

    expect(page.querySelector('.welcome')?.textContent).toContain('test-admin');
    expect(page.querySelectorAll('.kpi-card')).toHaveLength(6);
    expect(page.querySelector('.year-strip')?.textContent).toContain('2026-27');
    expect(charts.trendData().labels).toHaveLength(6);
    expect(charts.markedClasses().length).toBeGreaterThan(0);
    expect(charts.pendingClasses()).toHaveLength(stats.pendingClassAttendanceCount);
    expect(charts.today()?.classes.reduce((sum, c) => sum + c.total, 0)).toBe(stats.totalStudents);
    for (const data of [charts.genderData(), charts.levelData()]) {
      expect(data.datasets[0].data.reduce<number>((sum, value) => sum + Number(value), 0)).toBe(stats.totalStudents);
    }

    page.querySelector<HTMLElement>('.kpi-card.clickable')!.click();
    harness.detectChanges();
    expect(harness.fixture.nativeElement.querySelectorAll('.modal-body tbody tr')).toHaveLength(stats.pendingClassAttendanceCount);
    expect(harness.fixture.nativeElement.querySelector('.modal-body a')).toBeNull();

    page.querySelector<HTMLButtonElement>('.btn-refresh')!.click();
    harness.detectChanges();
    expect(page.querySelectorAll('.kpi-card')).toHaveLength(6);
    http.verify();
  });
});
