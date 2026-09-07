import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExitStudentModal } from './exit-student-modal';

describe('ExitStudentModal', () => {
  let component: ExitStudentModal;
  let fixture: ComponentFixture<ExitStudentModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExitStudentModal],
    }).compileComponents();

    fixture = TestBed.createComponent(ExitStudentModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
