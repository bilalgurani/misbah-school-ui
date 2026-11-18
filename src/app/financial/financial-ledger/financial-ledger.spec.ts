import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinancialLedger } from './financial-ledger';

describe('FinancialLedger', () => {
  let component: FinancialLedger;
  let fixture: ComponentFixture<FinancialLedger>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinancialLedger],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FinancialLedger);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
