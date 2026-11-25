import { ChevronDown, MessageCircleQuestion } from 'lucide-react';
import type { Frontmatter } from '@/lib/content/schema';

/** Native disclosure rows keep every answer available before JavaScript loads. */
export default function FAQAccordion({ items }: { items: Frontmatter['faq'] }) {
  return (
    <section aria-labelledby="faq-heading" className="mx-auto mt-12 max-w-[68ch] border-t border-border pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
            Quick answers · {items.length} questions
          </p>
          <h2 id="faq-heading" className="mt-2 font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Questions
          </h2>
        </div>
        <p className="max-w-xs font-sans text-sm leading-relaxed text-muted-foreground sm:text-right">
          Open a question for a concise, source-aware answer.
        </p>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        {items.map((item, index) => {
          const number = String(index + 1).padStart(2, '0');
          const questionId = `faq-question-${index + 1}`;
          const answerId = `faq-answer-${index + 1}`;
          return (
            <details
              key={item.question}
              data-faq-item
              open={index === 0}
              className="group border-b border-border last:border-b-0"
            >
              <summary
                id={questionId}
                aria-controls={answerId}
                className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/45 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring sm:gap-4 sm:px-5"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/5 font-mono text-[0.6875rem] font-bold text-primary"
                >
                  {number}
                </span>
                <span className="flex-1 font-sans text-sm font-semibold leading-snug text-foreground sm:text-base">
                  {item.question}
                </span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div
                id={answerId}
                aria-labelledby={questionId}
                className="border-t border-border/70 bg-muted/20 px-4 pb-5 pt-4 sm:pl-[4.5rem] sm:pr-6"
              >
                <p className="font-sans text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
                  {item.answer}
                </p>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
