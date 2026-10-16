import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

type QuizScreen = 'intro' | 'quiz' | 'result';
type QuestionType = 'single' | 'multiple' | 'text';
type QuestionAnswer = string | string[];

interface QuizQuestion {
  id: number;
  section: number;
  title: string;
  type: QuestionType;
  options: string[];
  correctAnswer: QuestionAnswer;
  answer: QuestionAnswer;
  visited: boolean;
  saved: boolean;
}

export interface AttemptQuizResult {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeTaken: string;
  submittedAt: Date;
  attempt: number;
}

const QUESTION_BANK: Omit<QuizQuestion, 'answer' | 'visited' | 'saved'>[] = [
  {
    id: 1,
    section: 1,
    title: 'Which statement best describes a measurable learning objective?',
    type: 'single',
    options: [
      'It describes a specific learner action',
      'It lists every course resource',
      'It gives the course a short title',
      'It replaces learner assessment',
      'It records attendance only',
    ],
    correctAnswer: 'It describes a specific learner action',
  },
  {
    id: 2,
    section: 1,
    title: 'Select the elements that make instructions easier to follow.',
    type: 'multiple',
    options: [
      'Clear action verbs',
      'Logical step order',
      'Unexplained acronyms',
      'Useful examples',
      'Conflicting directions',
    ],
    correctAnswer: ['Clear action verbs', 'Logical step order', 'Useful examples'],
  },
  {
    id: 3,
    section: 1,
    title: 'What term describes information given to a learner about their performance?',
    type: 'text',
    options: [],
    correctAnswer: 'feedback',
  },
  {
    id: 4,
    section: 1,
    title: 'What is the main purpose of a knowledge check?',
    type: 'single',
    options: [
      'Measure understanding during learning',
      'Replace all course content',
      'Collect payment information',
      'Change the learner profile',
      'Hide course progress',
    ],
    correctAnswer: 'Measure understanding during learning',
  },
  {
    id: 5,
    section: 2,
    title: 'Which option is an example of active learning?',
    type: 'single',
    options: [
      'Solving a realistic scenario',
      'Ignoring all practice tasks',
      'Reading a title only',
      'Skipping feedback',
      'Closing the course',
    ],
    correctAnswer: 'Solving a realistic scenario',
  },
  {
    id: 6,
    section: 2,
    title: 'Select the valid ways to support learner accessibility.',
    type: 'multiple',
    options: [
      'Provide meaningful labels',
      'Use sufficient color contrast',
      'Rely on color alone',
      'Support keyboard navigation',
      'Remove focus indicators',
    ],
    correctAnswer: [
      'Provide meaningful labels',
      'Use sufficient color contrast',
      'Support keyboard navigation',
    ],
  },
  {
    id: 7,
    section: 2,
    title: 'Enter the word used for content that adapts to different screen sizes.',
    type: 'text',
    options: [],
    correctAnswer: 'responsive',
  },
  {
    id: 8,
    section: 2,
    title: 'Which design choice most improves readability?',
    type: 'single',
    options: [
      'Clear hierarchy and comfortable spacing',
      'Long paragraphs in all capital letters',
      'Low-contrast body text',
      'Several competing typefaces',
      'Very small interactive controls',
    ],
    correctAnswer: 'Clear hierarchy and comfortable spacing',
  },
  {
    id: 9,
    section: 3,
    title: 'Which assessment format allows more than one answer to be selected?',
    type: 'single',
    options: ['Multiple choice', 'Single choice', 'Text response', 'Read only', 'Timer'],
    correctAnswer: 'Multiple choice',
  },
  {
    id: 10,
    section: 3,
    title: 'Select the information commonly shown in a quiz summary.',
    type: 'multiple',
    options: ['Score', 'Time taken', 'Attempt number', 'Correct answers', 'Private password'],
    correctAnswer: ['Score', 'Time taken', 'Attempt number', 'Correct answers'],
  },
  {
    id: 11,
    section: 3,
    title: 'What action sends completed answers for evaluation?',
    type: 'text',
    options: [],
    correctAnswer: 'submit',
  },
  {
    id: 12,
    section: 3,
    title: 'When should the Finish action become available?',
    type: 'single',
    options: [
      'After all questions are answered',
      'Before the quiz starts',
      'Only while printing',
      'After the browser closes',
      'Before any section loads',
    ],
    correctAnswer: 'After all questions are answered',
  },
  {
    id: 13,
    section: 4,
    title: 'What should happen when a learner refreshes during an attempt?',
    type: 'single',
    options: [
      'Progress should be restored',
      'Every answer should be deleted',
      'A second submission should be created',
      'The score should be set to zero',
      'The next unit should open',
    ],
    correctAnswer: 'Progress should be restored',
  },
  {
    id: 14,
    section: 4,
    title: 'Select the states represented in the question status legend.',
    type: 'multiple',
    options: ['Completed', 'Incomplete', 'Not saved', 'Archived', 'Locked forever'],
    correctAnswer: ['Completed', 'Incomplete', 'Not saved'],
  },
  {
    id: 15,
    section: 4,
    title: 'Enter the word for attempting the quiz again.',
    type: 'text',
    options: [],
    correctAnswer: 'retest',
  },
  {
    id: 16,
    section: 4,
    title: 'How should repeated clicks on a submission button be handled?',
    type: 'single',
    options: [
      'Process the action once',
      'Create duplicate attempts',
      'Increase the score each time',
      'Skip validation',
      'Delete the current section',
    ],
    correctAnswer: 'Process the action once',
  },
  {
    id: 17,
    section: 5,
    title: 'What should the Print action include?',
    type: 'single',
    options: [
      'Quiz questions and the result summary',
      'The learner password',
      'Browser history',
      'Unrelated course records',
      'Application source code',
    ],
    correctAnswer: 'Quiz questions and the result summary',
  },
  {
    id: 18,
    section: 5,
    title: 'Select the actions available after a completed quiz.',
    type: 'multiple',
    options: ['View summary', 'Print', 'Retest', 'Go to next unit', 'Duplicate submission'],
    correctAnswer: ['View summary', 'Print', 'Retest', 'Go to next unit'],
  },
  {
    id: 19,
    section: 5,
    title: 'Enter the result shown when the required score is achieved.',
    type: 'text',
    options: [],
    correctAnswer: 'passed',
  },
  {
    id: 20,
    section: 5,
    title: 'What is the safest response when submission status is uncertain?',
    type: 'single',
    options: [
      'Verify status before submitting again',
      'Immediately create several submissions',
      'Discard all saved progress',
      'Mark every answer correct',
      'Open the next unit without confirmation',
    ],
    correctAnswer: 'Verify status before submitting again',
  },
];

@Component({
  selector: 'app-attempt-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attempt-quiz.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttemptQuizComponent implements OnInit, OnDestroy {
  @Input() freshAttempt = false;
  @Output() readonly quizFinished = new EventEmitter<AttemptQuizResult>();
  @Output() readonly nextUnit = new EventEmitter<void>();

  readonly sections = [1, 2, 3, 4, 5];
  readonly storageKey = 'attempt-quiz-progress-v1';

  screen: QuizScreen = 'intro';
  questions: QuizQuestion[] = this.createQuestions();
  currentIndex = 0;
  elapsedSeconds = 0;
  attempt = 1;
  submittedAt = new Date();
  showCorrectAnswers = false;
  showIncorrectAnswers = false;
  isSubmitting = false;

  private timerId?: ReturnType<typeof setInterval>;
  private readonly browser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.browser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.freshAttempt) {
      this.resetForFreshAttempt();
      return;
    }

    this.restoreProgress();
    if (this.screen === 'quiz') {
      this.currentQuestion.visited = true;
      this.startTimer();
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  get currentQuestion(): QuizQuestion {
    return this.questions[this.currentIndex];
  }

  get currentSection(): number {
    return this.currentQuestion.section;
  }

  get answeredCount(): number {
    return this.questions.filter((question) => this.isAnswered(question)).length;
  }

  get canFinish(): boolean {
    return this.answeredCount === this.questions.length && !this.isSubmitting;
  }

  get correctCount(): number {
    return this.questions.filter((question) => this.isCorrect(question)).length;
  }

  get incorrectCount(): number {
    return this.questions.length - this.correctCount;
  }

  get score(): number {
    return Math.round((this.correctCount / this.questions.length) * 100);
  }

  get formattedTime(): string {
    const hours = Math.floor(this.elapsedSeconds / 3600);
    const minutes = Math.floor((this.elapsedSeconds % 3600) / 60);
    const seconds = this.elapsedSeconds % 60;
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  }

  get questionTypeLabel(): string {
    if (this.currentQuestion.type === 'multiple') return 'Multiple choice';
    if (this.currentQuestion.type === 'text') return 'Text response';
    return 'Single choice';
  }

  get correctQuestions(): QuizQuestion[] {
    return this.questions.filter((question) => this.isCorrect(question));
  }

  get incorrectQuestions(): QuizQuestion[] {
    return this.questions.filter((question) => !this.isCorrect(question));
  }

  startQuiz(): void {
    this.screen = 'quiz';
    this.currentQuestion.visited = true;
    this.startTimer();
    this.saveProgress();
    this.cdr.markForCheck();
  }

  selectSingleAnswer(value: string): void {
    this.currentQuestion.answer = value;
    this.markCurrentAsChanged();
  }

  toggleMultipleAnswer(value: string): void {
    const current = Array.isArray(this.currentQuestion.answer)
      ? [...this.currentQuestion.answer]
      : [];
    const optionIndex = current.indexOf(value);

    if (optionIndex >= 0) current.splice(optionIndex, 1);
    else current.push(value);

    this.currentQuestion.answer = current;
    this.markCurrentAsChanged();
  }

  updateTextAnswer(value: string): void {
    this.currentQuestion.answer = value.slice(0, 500);
    this.markCurrentAsChanged();
  }

  isOptionSelected(option: string): boolean {
    const answer = this.currentQuestion.answer;
    return Array.isArray(answer) ? answer.includes(option) : answer === option;
  }

  goToQuestion(index: number): void {
    if (index < 0 || index >= this.questions.length || index === this.currentIndex) return;
    this.saveCurrentQuestion();
    this.currentIndex = index;
    this.currentQuestion.visited = true;
    this.saveProgress();
    this.cdr.markForCheck();
  }

  previousQuestion(): void {
    if (this.currentIndex === 0) return;
    this.goToQuestion(this.currentIndex - 1);
  }

  nextQuestion(): void {
    if (this.currentIndex >= this.questions.length - 1) return;
    this.goToQuestion(this.currentIndex + 1);
  }

  submitSection(): void {
    this.saveCurrentQuestion();
    const nextSectionIndex = this.questions.findIndex(
      (question) => question.section > this.currentSection,
    );

    if (nextSectionIndex >= 0) {
      this.currentIndex = nextSectionIndex;
      this.currentQuestion.visited = true;
    }

    this.saveProgress();
    this.cdr.markForCheck();
  }

  finishQuiz(): void {
    if (!this.canFinish) return;

    this.isSubmitting = true;
    this.questions.forEach((question) => (question.saved = true));
    this.submittedAt = new Date();
    this.screen = 'result';
    this.stopTimer();

    const result: AttemptQuizResult = {
      score: this.score,
      correctAnswers: this.correctCount,
      totalQuestions: this.questions.length,
      timeTaken: this.formattedTime,
      submittedAt: this.submittedAt,
      attempt: this.attempt,
    };

    this.saveProgress();
    this.quizFinished.emit(result);
    this.isSubmitting = false;
    this.cdr.markForCheck();
  }

  retest(): void {
    this.attempt += 1;
    this.questions = this.createQuestions();
    this.currentIndex = 0;
    this.elapsedSeconds = 0;
    this.showCorrectAnswers = false;
    this.showIncorrectAnswers = false;
    this.screen = 'quiz';
    this.currentQuestion.visited = true;
    this.startTimer();
    this.saveProgress();
    this.cdr.markForCheck();
  }

  printResult(): void {
    if (this.browser) window.print();
  }

  goToNextUnit(): void {
    this.nextUnit.emit();
  }

  private resetForFreshAttempt(): void {
    if (this.browser) localStorage.removeItem(this.storageKey);
    this.screen = 'intro';
    this.questions = this.createQuestions();
    this.currentIndex = 0;
    this.elapsedSeconds = 0;
    this.attempt = 1;
    this.submittedAt = new Date();
    this.showCorrectAnswers = false;
    this.showIncorrectAnswers = false;
    this.isSubmitting = false;
    this.cdr.markForCheck();
  }

  toggleCorrectReview(): void {
    this.showCorrectAnswers = !this.showCorrectAnswers;
    if (this.showCorrectAnswers) this.showIncorrectAnswers = false;
  }

  toggleIncorrectReview(): void {
    this.showIncorrectAnswers = !this.showIncorrectAnswers;
    if (this.showIncorrectAnswers) this.showCorrectAnswers = false;
  }

  isAnswered(question: QuizQuestion): boolean {
    return Array.isArray(question.answer)
      ? question.answer.length > 0
      : question.answer.trim().length > 0;
  }

  isCorrect(question: QuizQuestion): boolean {
    if (Array.isArray(question.correctAnswer)) {
      if (!Array.isArray(question.answer)) return false;
      const expected = [...question.correctAnswer].sort();
      const actual = [...question.answer].sort();
      return expected.length === actual.length && expected.every((value, index) => value === actual[index]);
    }

    if (Array.isArray(question.answer)) return false;
    return this.normalize(question.answer) === this.normalize(question.correctAnswer);
  }

  questionButtonClasses(question: QuizQuestion, index: number): string {
    if (index === this.currentIndex) return 'bg-[#64bfd0] text-white ring-4 ring-[#64bfd0]/20';
    if (question.saved) return 'bg-[#64bfd0] text-white';
    if (this.isAnswered(question)) return 'bg-[#ffc857] text-white';
    if (question.visited) return 'bg-[#ff5b61] text-white';
    return 'bg-white text-[#b8b8b8] hover:bg-[#e8f7fa] hover:text-[#4caabd]';
  }

  sectionClasses(section: number): string {
    if (section < this.currentSection) return 'bg-[#64bfd0] text-white';
    if (section === this.currentSection) return 'bg-[#64bfd0] text-white ring-4 ring-[#64bfd0]/20';
    return 'bg-[#f2f2f2] text-[#b8b8b8]';
  }

  answerAsText(answer: QuestionAnswer): string {
    return Array.isArray(answer) ? answer.join(', ') : answer || 'No answer';
  }

  trackByQuestion(_: number, question: QuizQuestion): number {
    return question.id;
  }

  trackByValue(_: number, value: string | number): string | number {
    return value;
  }

  private createQuestions(): QuizQuestion[] {
    return QUESTION_BANK.map((question) => ({
      ...question,
      options: [...question.options],
      correctAnswer: Array.isArray(question.correctAnswer)
        ? [...question.correctAnswer]
        : question.correctAnswer,
      answer: question.type === 'multiple' ? [] : '',
      visited: false,
      saved: false,
    }));
  }

  private markCurrentAsChanged(): void {
    this.currentQuestion.visited = true;
    this.currentQuestion.saved = false;
    this.saveProgress();
    this.cdr.markForCheck();
  }

  private saveCurrentQuestion(): void {
    if (this.isAnswered(this.currentQuestion)) this.currentQuestion.saved = true;
  }

  private normalize(value: string): string {
    return value.trim().toLocaleLowerCase();
  }

  private startTimer(): void {
    if (!this.browser || this.timerId) return;
    this.timerId = setInterval(() => {
      this.elapsedSeconds += 1;
      if (this.elapsedSeconds % 5 === 0) this.saveProgress();
      this.cdr.markForCheck();
    }, 1000);
  }

  private stopTimer(): void {
    if (!this.timerId) return;
    clearInterval(this.timerId);
    this.timerId = undefined;
  }

  private saveProgress(): void {
    if (!this.browser) return;

    const state = {
      screen: this.screen,
      questions: this.questions.map(({ answer, visited, saved }) => ({ answer, visited, saved })),
      currentIndex: this.currentIndex,
      elapsedSeconds: this.elapsedSeconds,
      attempt: this.attempt,
      submittedAt: this.submittedAt.toISOString(),
    };

    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  private restoreProgress(): void {
    if (!this.browser) return;

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const state = JSON.parse(raw) as {
        screen?: QuizScreen;
        questions?: { answer: QuestionAnswer; visited: boolean; saved: boolean }[];
        currentIndex?: number;
        elapsedSeconds?: number;
        attempt?: number;
        submittedAt?: string;
      };

      if (state.questions?.length === this.questions.length) {
        this.questions = this.questions.map((question, index) => ({
          ...question,
          answer: state.questions?.[index]?.answer ?? question.answer,
          visited: state.questions?.[index]?.visited ?? false,
          saved: state.questions?.[index]?.saved ?? false,
        }));
      }

      if (state.screen === 'intro' || state.screen === 'quiz' || state.screen === 'result') {
        this.screen = state.screen;
      }
      this.currentIndex = Math.min(
        Math.max(Number(state.currentIndex) || 0, 0),
        this.questions.length - 1,
      );
      this.elapsedSeconds = Math.max(Number(state.elapsedSeconds) || 0, 0);
      this.attempt = Math.max(Number(state.attempt) || 1, 1);
      if (state.submittedAt) this.submittedAt = new Date(state.submittedAt);
    } catch {
      localStorage.removeItem(this.storageKey);
    }
  }
}
