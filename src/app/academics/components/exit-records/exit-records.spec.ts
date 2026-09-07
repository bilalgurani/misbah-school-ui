import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExitRecords } from './exit-records';

describe('ExitRecords', () => {
  let component: ExitRecords;
  let fixture: ComponentFixture<ExitRecords>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExitRecords],
    }).compileComponents();

    fixture = TestBed.createComponent(ExitRecords);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
