import { createMaskedTokens } from './tokenizer.js';
import { playKeyClick, playErrorSound, playWordSuccess, playVictorySound } from './soundEngine.js';
import { recordPracticeSession } from '../data/storage.js';

export class TypingEngine {
  constructor(options = {}) {
    this.section = null;
    this.targetText = '';
    this.level = 1;
    this.tokens = [];
    this.userInput = '';
    this.currentIndex = 0; // index in targetText
    this.isCompleted = false;

    // Accuracy counters
    this.totalKeystrokes = 0;
    this.errorCount = 0;
    this.hintsUsed = 0;

    // Callbacks
    this.onUpdate = options.onUpdate || (() => {});
    this.onComplete = options.onComplete || (() => {});
  }

  loadSection(section, level = 1, textType = 'principles') {
    this.reset();
    this.section = section;
    this.level = Number(level) || 1;
    this.textType = textType; // 'principles' (default for memorization) or 'fullText'

    // Clean whitespace and normalize target text
    const raw = (textType === 'fullText' && section.fullText)
      ? section.fullText
      : section.principles;

    this.targetText = raw.trim().replace(/\r\n/g, '\n');
    this.tokens = createMaskedTokens(this.targetText, this.level);

    // Calculate total substantive characters (excluding spaces & newlines)
    let substantiveCount = 0;
    for (let i = 0; i < this.targetText.length; i++) {
      if (!/\s/.test(this.targetText[i])) substantiveCount++;
    }
    this.totalSubstantiveChars = substantiveCount;
    this.substantiveMatched = 0;

    // Auto-advance past any initial whitespace
    while (this.currentIndex < this.targetText.length && /\s/.test(this.targetText[this.currentIndex])) {
      this.currentIndex++;
    }

    this.onUpdate(this.getState());
  }

  destroy() {
    this.isCompleted = true;
    this.onUpdate = () => {};
    this.onComplete = () => {};
  }

  reset() {
    this.userInput = '';
    this.errorChars = '';
    this.previousErrorLength = 0;
    this.currentIndex = 0;
    this.substantiveMatched = 0;
    this.totalSubstantiveChars = 0;
    this.isCompleted = false;
    this.totalKeystrokes = 0;
    this.hintsUsed = 0;
  }

  /**
   * Handle text input from user (e.g. from an input or textarea event)
   * - Incorrect characters are NOT blocked, but captured in errorChars (to display in red)
   * - Accuracy drops while errorChars exist
   * - When user backspaces and deletes errorChars, accuracy recalculates back up!
   */
  handleInput(inputValue) {
    if (this.isCompleted || !this.targetText) return;

    const target = this.targetText;
    const targetLength = target.length;
    const input = inputValue;
    const inputLength = input.length;

    let pT = 0;
    let pU = 0;

    while (pU < inputLength && pT < targetLength) {
      const chT = target[pT];
      const chU = input[pU];

      const isWhiteT = /\s/.test(chT);
      const isWhiteU = /\s/.test(chU);

      if (isWhiteT && isWhiteU) {
        // Both whitespace: consume all consecutive whitespace in both
        while (pT < targetLength && /\s/.test(target[pT])) pT++;
        while (pU < inputLength && /\s/.test(input[pU])) pU++;
      } else if (isWhiteT && !isWhiteU) {
        // Target has whitespace, user omitted it: skip whitespace in target
        while (pT < targetLength && /\s/.test(target[pT])) pT++;
      } else if (!isWhiteT && isWhiteU) {
        // Target does not have whitespace, but user pressed space/enter:
        // Ignore user's whitespace without penalty
        while (pU < inputLength && /\s/.test(input[pU])) pU++;
      } else {
        // Both are substantive characters
        if (chT === chU) {
          pT++;
          pU++;
        } else {
          // Mismatch: stop matching substantive prefix here
          break;
        }
      }
    }

    // Auto-advance pT over any whitespace in target text
    while (pT < targetLength && /\s/.test(target[pT])) {
      pT++;
    }

    // Count substantive characters typed so far
    let substantiveTyped = 0;
    for (let i = 0; i < pT; i++) {
      if (!/\s/.test(target[i])) substantiveTyped++;
    }

    const previousSubstantive = this.substantiveMatched;
    const errorChars = input.slice(pU);
    const prevErrorLen = this.previousErrorLength || 0;

    if (errorChars.length > prevErrorLen) {
      // User typed an incorrect character -> error sound
      playErrorSound();
    } else if (errorChars.length === 0 && substantiveTyped > previousSubstantive) {
      // User typed a correct character -> key click
      playKeyClick();
    }

    this.currentIndex = pT;
    this.substantiveMatched = substantiveTyped;
    this.errorChars = errorChars;
    this.previousErrorLength = errorChars.length;
    this.userInput = input; // Keep full input so user can type freely and backspace

    // Check completion: all substantive characters typed AND no error characters left
    if (this.substantiveMatched >= this.totalSubstantiveChars && errorChars.length === 0) {
      this.currentIndex = targetLength;
      this.finishSession();
      return;
    }

    this.onUpdate(this.getState());
  }

  /**
   * Provide a hint: automatically types the next character or word
   */
  giveHint() {
    if (this.isCompleted || !this.targetText) return;
    this.hintsUsed++;

    // Clear any pending error characters
    this.errorChars = '';
    this.previousErrorLength = 0;

    // Skip any whitespace first
    while (this.currentIndex < this.targetText.length && /\s/.test(this.targetText[this.currentIndex])) {
      this.currentIndex++;
    }

    const remaining = this.targetText.slice(this.currentIndex);
    if (!remaining) return;

    let advanceBy = 1;
    const thaiCombiningRegex = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/;
    while (
      advanceBy < remaining.length &&
      thaiCombiningRegex.test(remaining[advanceBy])
    ) {
      advanceBy++;
    }

    this.currentIndex += advanceBy;
    while (this.currentIndex < this.targetText.length && /\s/.test(this.targetText[this.currentIndex])) {
      this.currentIndex++;
    }

    this.userInput = this.targetText.slice(0, this.currentIndex);
    playWordSuccess();

    let substantiveTyped = 0;
    for (let i = 0; i < this.currentIndex; i++) {
      if (!/\s/.test(this.targetText[i])) substantiveTyped++;
    }
    this.substantiveMatched = substantiveTyped;

    if (this.substantiveMatched >= this.totalSubstantiveChars) {
      this.currentIndex = this.targetText.length;
      this.finishSession();
      return;
    }

    this.onUpdate(this.getState());
  }

  finishSession() {
    this.isCompleted = true;
    playVictorySound();

    const state = this.getState();

    // Record to storage / SRS
    const wordCount = this.tokens.filter(t => t.isWord).length;
    const sessionResult = recordPracticeSession({
      sectionId: this.section.id,
      level: this.level,
      accuracy: state.accuracy,
      wordsCount: wordCount
    });

    this.onUpdate(state);
    this.onComplete({
      ...state,
      sessionResult,
      section: this.section,
      level: this.level
    });
  }

  getState() {
    let substantiveTyped = 0;
    for (let i = 0; i < this.currentIndex; i++) {
      if (!/\s/.test(this.targetText[i])) substantiveTyped++;
    }

    const totalSubstantive = this.totalSubstantiveChars || 1;
    const progressPercent = Math.min(100, Math.round((substantiveTyped / totalSubstantive) * 100));

    // Dynamic Accuracy Calculation:
    // Drops when errorChars exist, rises back to 100% when user backspaces and deletes them!
    const currentErrors = this.errorChars ? this.errorChars.length : 0;
    let accuracy = 100;
    if (substantiveTyped > 0 || currentErrors > 0) {
      const correctChars = substantiveTyped;
      const totalAttempts = correctChars + (currentErrors * 2) + (this.hintsUsed * 2);
      accuracy = Math.max(0, Math.min(100, Math.round((correctChars / Math.max(1, totalAttempts)) * 100)));
    }

    return {
      targetText: this.targetText,
      userInput: this.userInput,
      errorChars: this.errorChars || '',
      currentIndex: this.currentIndex,
      targetLength: this.targetText.length,
      substantiveMatched: substantiveTyped,
      totalSubstantive: totalSubstantive,
      level: this.level,
      tokens: this.tokens,
      isCompleted: this.isCompleted,
      progressPercent,
      accuracy,
      currentErrors,
      hintsUsed: this.hintsUsed
    };
  }
}
