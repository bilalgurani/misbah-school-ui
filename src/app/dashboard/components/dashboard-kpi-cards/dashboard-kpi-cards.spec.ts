import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardKpiCards } from './dashboard-kpi-cards';

describe('DashboardKpiCards', () => {
  let component: DashboardKpiCards;
  let fixture: ComponentFixture<DashboardKpiCards>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardKpiCards],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardKpiCards);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
