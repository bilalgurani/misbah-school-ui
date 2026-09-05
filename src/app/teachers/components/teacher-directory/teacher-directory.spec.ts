import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherDirectory } from './teacher-directory';

describe('TeacherDirectory', () => {
  let component: TeacherDirectory;
  let fixture: ComponentFixture<TeacherDirectory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherDirectory],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherDirectory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
