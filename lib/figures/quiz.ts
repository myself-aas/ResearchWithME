/**
 * Pure logic for the SelfCheckQuiz figure (archetype: answer-reveal-quiz).
 * The only component in the library that judges reader input; scoring stays
 * here so a question can never disagree with its own answer key.
 */

export type QuizOption = {
  text: string;
  why: string;
  correct?: boolean;
}

export type QuizQuestion = {
  prompt: string;
  options: QuizOption[];
}

/** Index of the correct option, or -1 when the data is malformed. */
export function correctIndex(question: QuizQuestion): number {
  return question.options.findIndex((option) => option.correct === true);
}

export function isAnswerCorrect(question: QuizQuestion, chosen: number): boolean {
  return chosen >= 0 && chosen === correctIndex(question);
}

export function scoreOf(answers: ReadonlyArray<number | undefined>, questions: QuizQuestion[]): number {
  return questions.reduce(
    (score, question, index) => score + (isAnswerCorrect(question, answers[index] ?? -1) ? 1 : 0),
    0,
  );
}
