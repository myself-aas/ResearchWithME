'use client';

import { useState } from 'react';
import FigureChrome, { PRIMARY_BUTTON, READOUT_CLASS, SECONDARY_BUTTON } from './FigureChrome';
import { correctIndex, isAnswerCorrect, scoreOf, type QuizQuestion } from '@/lib/figures/quiz';

/**
 * SelfCheckQuiz — archetype `answer-reveal-quiz`.
 *
 * The library's only judge: the reader commits to an answer, and the figure
 * responds with right/wrong plus the reasoning behind every option. Native
 * radio inputs keep the semantics free; the reveal, per-option explanations,
 * and the final score are the expressive layer.
 */
export default function SelfCheckQuiz({
  title = 'Check yourself',
  questions,
}: {
  title?: string;
  questions: QuizQuestion[];
}) {
  const [answers, setAnswers] = useState<Array<number | undefined>>(() => questions.map(() => undefined));
  const [current, setCurrent] = useState(0);
  const question = questions[current];
  const chosen = answers[current];
  const answered = chosen !== undefined;
  const finished = current === questions.length - 1 && answered;
  const score = scoreOf(answers, questions);

  function choose(optionIndex: number) {
    setAnswers((currentAnswers) => {
      const next = [...currentAnswers];
      next[current] = optionIndex;
      return next;
    });
  }

  function restart() {
    setAnswers(questions.map(() => undefined));
    setCurrent(0);
  }

  if (!question) return null;

  return (
    <FigureChrome
      title={title}
      subtitle="Commit to an answer — every option explains itself after the choice, so a wrong turn still teaches."
    >
      <div className="flex items-center gap-2" aria-hidden="true">
        {questions.map((_, index) => (
          <span
            key={index}
            className={`h-2 w-2 rounded-full ${
              index < current || (index === current && answered)
                ? isAnswerCorrect(questions[index], answers[index] ?? -1)
                  ? 'bg-brand'
                  : 'bg-destructive'
                : index === current
                  ? 'bg-ink'
                  : 'bg-surface-subtle border border-line'
            }`}
          />
        ))}
        <span className={`${READOUT_CLASS} ml-2`}>
          Question {current + 1} of {questions.length}
        </span>
      </div>

      <fieldset className="mt-4" disabled={answered}>
        <legend className="font-sans text-sm font-semibold text-ink">{question.prompt}</legend>
        <div className="mt-3 flex flex-col gap-2">
          {question.options.map((option, optionIndex) => {
            const isChosen = chosen === optionIndex;
            const reveal = answered;
            return (
              <label
                key={optionIndex}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  reveal && option.correct
                    ? 'border-brand bg-selection/60'
                    : reveal && isChosen && !option.correct
                      ? 'border-destructive bg-destructive/5'
                      : 'border-line bg-canvas hover:border-brand'
                }`}
              >
                <input
                  type="radio"
                  name={`quiz-option-${current}`}
                  checked={isChosen}
                  onChange={() => choose(optionIndex)}
                  className="mt-1 accent-[var(--color-brand)]"
                  aria-label={option.text}
                />
                <span>
                  <span className="block font-sans text-sm text-ink">{option.text}</span>
                  {reveal && (isChosen || option.correct) && (
                    <span className="mt-1 block font-sans text-xs leading-relaxed text-ink-secondary">{option.why}</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {answered && (
        <div aria-live="polite" className="mt-4">
          <p className={`font-mono text-xs font-semibold ${isAnswerCorrect(question, chosen) ? 'text-brand' : 'text-destructive'}`}>
            {isAnswerCorrect(question, chosen) ? 'Correct.' : `Not quite — the answer is option ${correctIndex(question) + 1}.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {finished ? (
              <>
                <span className="inline-flex min-h-11 items-center rounded-full border border-line bg-canvas px-4 font-mono text-sm text-ink">
                  Score: {score} / {questions.length}
                </span>
                <button type="button" onClick={restart} className={PRIMARY_BUTTON}>
                  Try again
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setCurrent((value) => value + 1)} className={PRIMARY_BUTTON}>
                Next question
              </button>
            )}
            <button type="button" onClick={restart} className={SECONDARY_BUTTON}>
              Reset quiz
            </button>
          </div>
        </div>
      )}

      <p className={`${READOUT_CLASS} mt-4`}>
        Answering is committing: the reveal shows why the right option is right, not only which one it is.
      </p>
    </FigureChrome>
  );
}
