import Link from 'next/link';
import { Text } from '@/components/primitives';
import { EDITOR_IN_CHIEF } from '@/lib/research-data';

/**
 * The single-editor page. Editorial standards text lives here; no editorial
 * board or invented roster is rendered.
 */
export default function EditorPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Text as="h1" variant="page-title">
        Editor
      </Text>

      <section className="mt-8 rounded-sm border border-line bg-surface p-6 sm:p-8">
        <Link
          href={`/author/${EDITOR_IN_CHIEF.profileSlug}`}
          className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Text as="p" variant="eyebrow" color="secondary">
            {EDITOR_IN_CHIEF.role}
          </Text>
          <Text as="h2" variant="section-title" className="mt-1 group-hover:text-brand-pressed">
            {EDITOR_IN_CHIEF.name}
          </Text>
          <Text as="p" variant="body" color="secondary" className="mt-2">
            View profile and published articles →
          </Text>
        </Link>
      </section>

      <section className="mt-10">
        <Text as="h2" variant="section-title">
          Editorial standards
        </Text>
        <div className="mt-4 space-y-4 font-sans text-sm leading-relaxed text-ink-secondary">
          <p>
            Articles on ResearchWithMe are written by writers approved by the editor and are
            published under CC BY 4.0. Each piece is reviewed for clarity, factual accuracy
            about primary sources, and attribution, but the site is not a peer-reviewed journal.
          </p>
          <p>
            Claims about published research are linked to primary papers or repositories so
            readers can verify them. Statistics are only shown when they can be computed from
            real data in the catalogue.
          </p>
          <p>
            Corrections are welcome; contact the editor to flag errors.
          </p>
        </div>
      </section>
    </div>
  );
}
