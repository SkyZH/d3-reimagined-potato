import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfitTableComponent } from './profit-table.component';

describe('ProfitTableComponent', () => {
  let component: ProfitTableComponent;
  let fixture: ComponentFixture<ProfitTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ProfitTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfitTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
