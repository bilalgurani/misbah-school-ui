import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PromoteStudents } from './promote-students';

describe('PromoteStudents', () => {
  let component: PromoteStudents;
  let fixture: ComponentFixture<PromoteStudents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PromoteStudents],
    }).compileComponents();

    fixture = TestBed.createComponent(PromoteStudents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
