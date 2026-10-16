import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray
} from '@angular/cdk/drag-drop';

export type QuestionType = 'single' | 'multiple' | 'short';
export type SelectedType = QuestionType | 'mixed' | null;
export type ScoringType = 'basic' | 'advanced';

export interface AnswerOption {
  id: string;
  text: string;
  correct: boolean;
  points: number;
}

export interface BankQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options: AnswerOption[];
  shortAnswer: string;
  scoringType: ScoringType;
  hidden: boolean;
}

export interface QuestionSection {
  id: string;
  name: string;
  questions: BankQuestion[];
  score: number;
  feedback: string;
}

export interface QuestionBank {
  id: string;
  questionType: SelectedType;
  sections: QuestionSection[];
  updatedAt: string;
  version: number;
}

@Component({
  selector: 'app-question-bank',
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './question-bank.html'
})
export class QuestionBankComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly draftKey = 'question-bank-draft';
  private readonly banksKey = 'question-banks';

  questionTypes: { label: string; value: Exclude<SelectedType, null> }[] = [
    { label: 'Single Answer', value: 'single' },
    { label: 'Multiple Answer', value: 'multiple' },
    { label: 'Short Answer', value: 'short' },
    { label: 'Mixed Answers', value: 'mixed' }
  ];

  bankId = this.newId();
  version = 0;
  selectedType: SelectedType = null;
  sections: QuestionSection[] = [];
  activeSectionId: string | null = null;
  editingSectionId: string | null = null;

  showBackDialog = false;
  showExisting = false;
  saving = false;
  dirty = false;

  message = '';
  messageType: 'success' | 'error' = 'success';

  existingQuestions: BankQuestion[] = [];
  private clipboard: BankQuestion | null = null;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  get activeSection(): QuestionSection | undefined {
    return this.sections.find(s => s.id === this.activeSectionId);
  }

  ngOnInit(): void {
    this.restoreDraft();
    this.loadExistingQuestions();
  }

  ngOnDestroy(): void {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
  }

  private newId(): string {
    return crypto.randomUUID();
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private createOption(text = ''): AnswerOption {
    return {
      id: this.newId(),
      text,
      correct: false,
      points: 0
    };
  }

  private createQuestion(type: QuestionType): BankQuestion {
    return {
      id: this.newId(),
      text: '',
      type,
      options: type === 'short'
        ? []
        : Array.from({ length: 4 }, () => this.createOption()),
      shortAnswer: '',
      scoringType: 'basic',
      hidden: false
    };
  }

  private defaultQuestionType(): QuestionType {
    return this.selectedType === 'multiple'
      ? 'multiple'
      : this.selectedType === 'short'
        ? 'short'
        : 'single';
  }

  changeType(type: Exclude<SelectedType, null>): void {
    this.selectedType = type;

    if (type !== 'mixed') {
      for (const section of this.sections) {
        for (const question of section.questions) {
          question.type = type;
          this.onQuestionTypeChange(question, false);
        }
      }
    }
    this.markDirty();
  }

  onQuestionTypeChange(question: BankQuestion, save = true): void {
    if (question.type === 'short') {
      question.options = [];
    } else if (question.options.length === 0) {
      question.options = Array.from(
        { length: 4 },
        () => this.createOption()
      );
    }

    if (question.type === 'single') {
      let found = false;
      for (const option of question.options) {
        if (option.correct && !found) {
          found = true;
        } else {
          option.correct = false;
        }
      }
    }

    if (save) this.markDirty();
  }

  addSection(): void {
    const section: QuestionSection = {
      id: this.newId(),
      name: `Section ${this.sections.length + 1}`,
      questions: [],
      score: 0,
      feedback: ''
    };

    this.sections.push(section);
    this.activeSectionId = section.id;
    this.markDirty();
  }

  selectSection(id: string): void {
    this.activeSectionId = id;
  }

  editSection(id: string): void {
    this.activeSectionId = id;
    this.editingSectionId = id;
  }

  renameActiveSection(name: string): void {
    const section = this.activeSection;
    if (!section) return;
    section.name = name;
    this.markDirty();
  }

  deleteSection(id: string): void {
    this.sections = this.sections.filter(s => s.id !== id);
    if (this.activeSectionId === id) {
      this.activeSectionId = this.sections[0]?.id ?? null;
    }
    this.markDirty();
  }

  duplicateSection(): void {
    const section = this.activeSection;
    if (!section) return;

    const copy = this.clone(section);
    copy.id = this.newId();
    copy.name += ' Copy';
    copy.questions = copy.questions.map(q => this.cloneQuestion(q));

    const index = this.sections.findIndex(s => s.id === section.id);
    this.sections.splice(index + 1, 0, copy);
    this.activeSectionId = copy.id;
    this.markDirty();
  }

  moveSection(direction: number): void {
    const index = this.sections.findIndex(
      s => s.id === this.activeSectionId
    );
    const target = index + direction;

    if (index < 0 || target < 0 || target >= this.sections.length) return;

    moveItemInArray(this.sections, index, target);
    this.markDirty();
  }

  dropSection(event: CdkDragDrop<QuestionSection[]>): void {
    moveItemInArray(
      this.sections,
      event.previousIndex,
      event.currentIndex
    );
    this.markDirty();
  }

  addQuestion(): void {
    if (!this.activeSection) this.addSection();
    this.activeSection?.questions.push(
      this.createQuestion(this.defaultQuestionType())
    );
    this.markDirty();
  }

  private cloneQuestion(question: BankQuestion): BankQuestion {
    const copy = this.clone(question);
    copy.id = this.newId();
    copy.options = copy.options.map(option => ({
      ...option,
      id: this.newId()
    }));
    return copy;
  }

  private findQuestion(id: string): BankQuestion | undefined {
    return this.activeSection?.questions.find(q => q.id === id);
  }

  duplicateQuestion(id: string): void {
    const section = this.activeSection;
    const question = this.findQuestion(id);
    if (!section || !question) return;

    const index = section.questions.findIndex(q => q.id === id);
    section.questions.splice(index + 1, 0, this.cloneQuestion(question));
    this.markDirty();
  }

  copyQuestion(id: string): void {
    const question = this.findQuestion(id);
    if (question) {
      this.clipboard = this.clone(question);
      this.notify('Question copied');
    }
  }

  cutQuestion(id: string): void {
    this.copyQuestion(id);
    this.deleteQuestion(id);
  }

  pasteQuestion(): void {
    if (!this.clipboard) return;
    if (!this.activeSection) this.addSection();
    this.activeSection?.questions.push(
      this.cloneQuestion(this.clipboard)
    );
    this.markDirty();
  }

  deleteQuestion(id: string): void {
    const section = this.activeSection;
    if (!section) return;

    section.questions = section.questions.filter(q => q.id !== id);
    this.markDirty();
  }

  addOption(question: BankQuestion): void {
    question.options.push(this.createOption());
    this.markDirty();
  }

  deleteOption(question: BankQuestion, optionId: string): void {
    question.options = question.options.filter(o => o.id !== optionId);
    this.markDirty();
  }

  duplicateOption(question: BankQuestion, optionId: string): void {
    const index = question.options.findIndex(o => o.id === optionId);
    if (index < 0) return;

    const copy = {
      ...question.options[index],
      id: this.newId(),
      correct: false
    };
    question.options.splice(index + 1, 0, copy);
    this.markDirty();
  }

  setCorrect(question: BankQuestion, optionId: string): void {
    if (question.type === 'single') {
      question.options.forEach(option => {
        option.correct = option.id === optionId;
      });
    } else if (question.type === 'multiple') {
      const option = question.options.find(o => o.id === optionId);
      if (option) option.correct = !option.correct;
    }
    this.markDirty();
  }

  setSectionScore(value: number | string): void {
    if (!this.activeSection) return;
    const number = Number(value);
    this.activeSection.score = Number.isFinite(number)
      ? Math.min(100, Math.max(0, number))
      : 0;
    this.markDirty();
  }

  setSectionFeedback(value: string): void {
    if (!this.activeSection) return;
    this.activeSection.feedback = value.slice(0, 500);
    this.markDirty();
  }

  private notify(
    message: string,
    type: 'success' | 'error' = 'success'
  ): void {
    this.message = message;
    this.messageType = type;
  }

  markDirty(): void {
    this.dirty = true;

    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => this.saveDraft(), 350);
  }

  private snapshot(): QuestionBank {
    return {
      id: this.bankId,
      questionType: this.selectedType,
      sections: this.clone(this.sections),
      updatedAt: new Date().toISOString(),
      version: this.version
    };
  }

  private saveDraft(): void {
    try {
      localStorage.setItem(this.draftKey, JSON.stringify(this.snapshot()));
    } catch {
      this.notify('Unable to save local draft', 'error');
    }
  }

  private restoreDraft(): void {
    try {
      const raw = localStorage.getItem(this.draftKey);
      if (!raw) return;

      const draft = JSON.parse(raw) as QuestionBank;
      this.bankId = draft.id;
      this.version = draft.version ?? 0;
      this.selectedType = draft.questionType;
      this.sections = draft.sections ?? [];
      this.activeSectionId = this.sections[0]?.id ?? null;
      this.dirty = true;
    } catch {
      this.notify('Unable to restore draft', 'error');
    }
  }

  private validate(): string | null {
    if (!this.sections.length) return 'Please add a section';

    for (const section of this.sections) {
      if (!section.name.trim()) return 'Section name is required';
      if (!section.questions.length) {
        return `Please add a question to ${section.name}`;
      }
      if (section.score < 0 || section.score > 100) {
        return 'Score must be between 0 and 100';
      }
      if (section.feedback.length > 500) {
        return 'Feedback must not exceed 500 characters';
      }

      for (const question of section.questions) {
        if (!question.text.trim()) return 'Please enter the question';
        if (question.text.length > 500) {
          return 'Question must not exceed 500 characters';
        }

        if (question.type === 'short') {
          if (question.shortAnswer.length > 500) {
            return 'Short answer must not exceed 500 characters';
          }
        } else {
          if (question.options.length < 2) {
            return 'Please add at least two answer options';
          }
          if (question.options.some(o => !o.text.trim())) {
            return 'Please fill all answer options';
          }
          if (question.options.some(o => o.text.length > 200)) {
            return 'Answer option must not exceed 200 characters';
          }
          if (!question.options.some(o => o.correct)) {
            return 'Please select a correct answer';
          }
          if (question.options.some(o => o.points < 0 || o.points > 100)) {
            return 'Option points must be between 0 and 100';
          }
        }
      }
    }
    return null;
  }

  async save(): Promise<boolean> {
    if (this.saving) return false;

    const error = this.validate();
    if (error) {
      this.notify(error, 'error');
      return false;
    }

    this.saving = true;

    try {
      const banks = this.getSavedBanks();
      const index = banks.findIndex(b => b.id === this.bankId);

      if (index >= 0 && banks[index].version !== this.version) {
        this.notify(
          'Another user has updated this Question Bank. Reload the latest version before saving.',
          'error'
        );
        return false;
      }

      const bank = this.snapshot();
      bank.version = this.version + 1;

      if (index >= 0) {
        banks[index] = bank;
      } else {
        banks.push(bank);
      }

      localStorage.setItem(this.banksKey, JSON.stringify(banks));
      localStorage.removeItem(this.draftKey);

      this.version = bank.version;
      this.dirty = false;
      this.loadExistingQuestions();
      this.notify('Question Bank saved successfully');
      return true;
    } catch {
      this.notify('Something went wrong. Please try again later.', 'error');
      return false;
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  private getSavedBanks(): QuestionBank[] {
    try {
      return JSON.parse(localStorage.getItem(this.banksKey) || '[]');
    } catch {
      return [];
    }
  }

  private loadExistingQuestions(): void {
    this.existingQuestions = this.getSavedBanks()
      .flatMap(bank => bank.sections)
      .flatMap(section => section.questions)
      .map(q => this.clone(q));
  }

  addExistingQuestion(question: BankQuestion): void {
    if (!this.activeSection) this.addSection();
    this.activeSection?.questions.push(this.cloneQuestion(question));
    this.markDirty();
    this.showExisting = false;
  }

  async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['pdf', 'doc', 'docx', 'csv', 'xls', 'xlsx'];

    if (!extension || !allowed.includes(extension)) {
      this.notify('Invalid file type', 'error');
      input.value = '';
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      this.notify('File size exceeds 100 MB.', 'error');
      input.value = '';
      return;
    }

    try {
      if (extension === 'csv') {
        const text = await file.text();
        const rows = this.parseCsv(text);

        if (!rows.length) {
          this.notify('No questions found in CSV file', 'error');
          return;
        }

        if (!this.activeSection) this.addSection();

        for (const row of rows) {
          if (!row[0]?.trim()) continue;
          const question = this.createQuestion(this.defaultQuestionType());
          question.text = row[0].slice(0, 500);

          if (question.type === 'short') {
            question.shortAnswer = (row[1] || '').slice(0, 500);
          } else {
            const values = row.slice(1, 5);
            question.options = values
              .filter(value => value.trim())
              .map(value => this.createOption(value.slice(0, 200)));
          }
          this.activeSection?.questions.push(question);
        }

        this.markDirty();
        this.notify('CSV questions imported. Please review the correct answers.');
      } else {
        this.notify(
          'File validated. PDF, Word and Excel question extraction requires a backend import service.',
          'error'
        );
      }
    } catch {
      this.notify('Unable to import file', 'error');
    } finally {
      input.value = '';
    }
  }

  private parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '"') {
        if (quoted && text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (char === ',' && !quoted) {
        row.push(field);
        field = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        if (row.some(value => value.trim())) rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }

    row.push(field);
    if (row.some(value => value.trim())) rows.push(row);
    return rows;
  }

  exportQuestions(): void {
    const questions = this.sections.flatMap(s => s.questions);

    if (!questions.length) {
      this.notify('No questions available to export', 'error');
      return;
    }

    const escapeCsv = (value: string | number): string =>
      `"${String(value).replace(/"/g, '""')}"`;

    const rows = [
      ['Section', 'Question', 'Type', 'Options', 'Correct Answers', 'Score', 'Feedback'],
      ...this.sections.flatMap(section =>
        section.questions.map(question => [
          section.name,
          question.text,
          question.type,
          question.options.map(o => o.text).join(' | '),
          question.type === 'short'
            ? question.shortAnswer
            : question.options.filter(o => o.correct).map(o => o.text).join(' | '),
          String(section.score),
          section.feedback
        ])
      )
    ];

    const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF', csv], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'question-bank.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.notify('Questions exported successfully');
  }

  back(): void {
    if (this.dirty) {
      this.showBackDialog = true;
    } else {
      this.navigateBack();
    }
  }

  discardChanges(): void {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    localStorage.removeItem(this.draftKey);
    this.dirty = false;
    this.showBackDialog = false;
    this.navigateBack();
  }

  async saveAndBack(): Promise<void> {
    const success = await this.save();
    if (success) {
      this.showBackDialog = false;
      this.navigateBack();
    }
  }

  private navigateBack(): void {
    const courseId =
      this.route.snapshot.paramMap.get('courseId') ??
      this.route.snapshot.queryParamMap.get('courseId');

    void this.router.navigate(['/admin-dashboard', 'courses'], {
      queryParams: courseId ? { organize: courseId } : undefined,
    });
  }
}
