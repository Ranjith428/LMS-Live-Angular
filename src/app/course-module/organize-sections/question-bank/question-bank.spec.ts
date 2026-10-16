
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';
import { QuestionBankComponent } from './question-bank';

describe('QuestionBankComponent', () => {
  let component: QuestionBankComponent;
  let fixture: ComponentFixture<QuestionBankComponent>;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [QuestionBankComponent],
      providers: [
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => null },
              queryParamMap: { get: () => null },
            },
          },
        },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionBankComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    fixture.destroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have empty default values', () => {
    expect(component.selectedType).toBeNull();
    expect(component.sections.length).toBe(0);
    expect(component.activeSection).toBeUndefined();
  });

  it('should add a new section', () => {
    component.addSection();

    expect(component.sections.length).toBe(1);
    expect(component.sections[0].name).toBe('Section 1');
    expect(component.sections[0].score).toBe(0);
    expect(component.sections[0].feedback).toBe('');
  });

  it('should add a question to the active section', () => {
    component.addSection();
    component.changeType('single');
    component.addQuestion();

    expect(component.activeSection?.questions.length).toBe(1);
    expect(component.activeSection?.questions[0].type).toBe('single');
    expect(component.activeSection?.questions[0].options.length).toBe(4);
  });

  it('should support multiple answer selection', () => {
    component.addSection();
    component.changeType('multiple');
    component.addQuestion();

    const question = component.activeSection!.questions[0];
    const first = question.options[0];
    const second = question.options[1];

    component.setCorrect(question, first.id);
    component.setCorrect(question, second.id);

    expect(first.correct).toBe(true);
    expect(second.correct).toBe(true);
  });

  it('should allow only one correct answer for single type', () => {
    component.addSection();
    component.changeType('single');
    component.addQuestion();

    const question = component.activeSection!.questions[0];
    const first = question.options[0];
    const second = question.options[1];

    component.setCorrect(question, first.id);
    component.setCorrect(question, second.id);

    expect(first.correct).toBe(false);
    expect(second.correct).toBe(true);
  });

  it('should add and delete answer options', () => {
    component.addSection();
    component.addQuestion();

    const question = component.activeSection!.questions[0];

    component.addOption(question);
    expect(question.options.length).toBe(5);

    const optionId = question.options[4].id;
    component.deleteOption(question, optionId);

    expect(question.options.length).toBe(4);
  });

  it('should duplicate a question with unique IDs', () => {
    component.addSection();
    component.addQuestion();

    const original = component.activeSection!.questions[0];
    component.duplicateQuestion(original.id);

    const questions = component.activeSection!.questions;

    expect(questions.length).toBe(2);
    expect(questions[0].id).not.toBe(questions[1].id);
    expect(questions[0].options[0].id)
      .not.toBe(questions[1].options[0].id);
  });

  it('should duplicate a section', () => {
    component.addSection();
    component.addQuestion();
    component.duplicateSection();

    expect(component.sections.length).toBe(2);
    expect(component.sections[1].name).toBe('Section 1 Copy');
    expect(component.sections[0].id)
      .not.toBe(component.sections[1].id);
  });

  it('should rearrange sections', () => {
    component.addSection();
    component.addSection();

    const firstId = component.sections[0].id;

    component.selectSection(firstId);
    component.moveSection(1);

    expect(component.sections[1].id).toBe(firstId);
  });

  it('should limit score between 0 and 100', () => {
    component.addSection();

    component.setSectionScore(150);
    expect(component.activeSection?.score).toBe(100);

    component.setSectionScore(-10);
    expect(component.activeSection?.score).toBe(0);
  });

  it('should limit feedback to 500 characters', () => {
    component.addSection();

    component.setSectionFeedback('A'.repeat(600));

    expect(component.activeSection?.feedback.length).toBe(500);
  });

  it('should prevent saving an empty question bank', async () => {
    const result = await component.save();

    expect(result).toBe(false);
    expect(component.messageType).toBe('error');
  });

  it('should save a valid question bank', async () => {
    component.addSection();
    component.changeType('single');
    component.addQuestion();

    const question = component.activeSection!.questions[0];
    question.text = 'What is Angular?';

    question.options.forEach((option, index) => {
      option.text = `Option ${index + 1}`;
    });

    component.setCorrect(question, question.options[0].id);

    const result = await component.save();

    expect(result).toBe(true);
    expect(component.message).toBe(
      'Question Bank saved successfully'
    );

    const saved = JSON.parse(
      localStorage.getItem('question-banks') || '[]'
    );

    expect(saved.length).toBe(1);
    expect(saved[0].sections[0].questions[0].text)
      .toBe('What is Angular?');
  });

  it('should update existing bank without duplicate records', async () => {
    component.addSection();
    component.addQuestion();

    const question = component.activeSection!.questions[0];
    question.text = 'Sample Question';

    question.options.forEach((option, index) => {
      option.text = `Answer ${index + 1}`;
    });

    component.setCorrect(question, question.options[0].id);

    await component.save();
    await component.save();

    const saved = JSON.parse(
      localStorage.getItem('question-banks') || '[]'
    );

    expect(saved.length).toBe(1);
  });

  it('should show confirmation when leaving with changes', () => {
    component.addSection();
    component.back();

    expect(component.showBackDialog).toBe(true);
  });

  it('should discard draft changes', () => {
    component.addSection();
    localStorage.setItem('question-bank-draft', 'test');

    component.discardChanges();

    expect(component.dirty).toBe(false);
    expect(localStorage.getItem('question-bank-draft')).toBeNull();
  });

  it('should reject unsupported import formats', async () => {
    const file = new File(['data'], 'questions.exe', {
      type: 'application/octet-stream'
    });

    const input = document.createElement('input');
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true
    });

    await component.importFile({
      target: input
    } as unknown as Event);

    expect(component.message).toBe('Invalid file type');
  });
});
