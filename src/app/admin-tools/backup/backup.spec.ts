import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatabaseBackup } from './backup';

describe('DatabaseBackup', () => {
  let fixture: ComponentFixture<DatabaseBackup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatabaseBackup],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(DatabaseBackup);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
