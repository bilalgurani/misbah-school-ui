import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentHistoryTab } from './student-history-tab';

describe('StudentHistoryTab', () => {
  let component: StudentHistoryTab;
  let fixture: ComponentFixture<StudentHistoryTab>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentHistoryTab],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentHistoryTab);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
