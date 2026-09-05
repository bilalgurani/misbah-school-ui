import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinancialLedger } from './financial-ledger';

describe('FinancialLedger', () => {
  let component: FinancialLedger;
  let fixture: ComponentFixture<FinancialLedger>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinancialLedger],
    }).compileComponents();

    fixture = TestBed.createComponent(FinancialLedger);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
