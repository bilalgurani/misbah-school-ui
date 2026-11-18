import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardCharts } from './dashboard-charts';

describe('DashboardCharts', () => {
  let component: DashboardCharts;
  let fixture: ComponentFixture<DashboardCharts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardCharts],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardCharts);
    fixture.componentRef.setInput('stats', {
      totalStudents: 10, prePrimaryStudents: 4, primaryStudents: 6, totalBoys: 5, totalGirls: 5, totalTeachers: 2,
      studentAttendancePercentage: 90, pendingClassAttendanceCount: 0, pendingClasses: [],
    });
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
