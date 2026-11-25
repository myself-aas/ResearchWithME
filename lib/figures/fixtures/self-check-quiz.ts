import type { QuizQuestion } from '../quiz';

/**
 * Fixture for the SelfCheckQuiz demo on /lab: a meta-quiz about reading
 * figures, so the demo teaches the lab's own conventions.
 */
export const SELF_CHECK_QUIZ_FIXTURE = {
  title: 'Check yourself: reading interactive figures',
  questions: [
    {
      prompt: 'A cell in a heat field is coloured by value. What does the palest cell mean?',
      options: [
        { text: 'The value is missing', why: 'Missing data is marked, not shaded — a legend or label says so.' },
        { text: 'The value is the lowest in its scale', why: 'Ramps run strongest to weakest tone; pale is simply the low end.', correct: true },
        { text: 'The cell is disabled', why: 'Nothing in a figure is decorative; pale still encodes a value.' },
      ],
    },
    {
      prompt: 'Two figures share a topic but drag different controls. What must differ?',
      options: [
        { text: 'Their interaction pattern', why: 'The constitution forbids two figures that differ only in subject matter.', correct: true },
        { text: 'Their colour palette', why: 'Both must resolve through the same token authority.' },
        { text: 'Nothing at all', why: 'Reusing a pattern with new data is exactly what the library exists for.' },
      ],
    },
    {
      prompt: 'Where must a figure also be renderable, besides the article?',
      options: [
        { text: 'In the print stylesheet', why: 'Print is not a maintained surface for interactive figures.' },
        { text: 'Inside the assistant thread', why: 'Article-only widgets are half-shipped; every figure is generative UI.', correct: true },
        { text: 'In the sitemap', why: 'The sitemap lists pages, not components.' },
      ],
    },
  ] as QuizQuestion[],
};
