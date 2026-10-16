import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttemptQuiz } from './attempt-quiz';

describe('AttemptQuiz', () => {
  let component: AttemptQuiz;
  let fixture: ComponentFixture<AttemptQuiz>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttemptQuiz],
    }).compileComponents();

    fixture = TestBed.createComponent(AttemptQuiz);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
