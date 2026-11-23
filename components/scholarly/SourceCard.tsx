/**
 * SourceCard — reme v3.1 §27.3 (stage 3, beta).
 *
 * MUST display: source type, title, contributors, date, identifier, version,
 * language, access state, integrity state, correction/retraction notice when
 * applicable. Original / translated / transliterated titles labeled distinctly.
 * Anatomy: notice first → type + integrity line → title block → metadata grid →
 *   expandable details (<details>) → actions.
 * States: retracted · corrected · embargoed · restricted · ready (logic in
 *   lib/scholarly/source-card.ts). Loading → Skeleton; error → Alert.
 * Screen reader: <article aria-label> from title + type.
 * Token mapping: component.sourceCard.* aliases. Tests: source-card.test.ts.
 */
import type { Source, SourceVersion, PermissionDecision, ObjectId } from '@/lib/schemas/scholarly';
import { resolveSourceState, primaryIdentifier, sourceCardLabel, sourceCardTokens } from '@/lib/scholarly/source-card';
import Skeleton from '@/components/ui/Skeleton';
import Alert from '@/components/ui/Alert';

export interface SourceCardProps {
  source: Source;
  sourceVersion: SourceVersion;
  permissions: PermissionDecision[];
  loading?: boolean;
  error?: string;
  onInspect?: (id: ObjectId) => void;
  onAddEvidence?: (id: ObjectId) => void;
  onRequestReview?: (id: ObjectId) => void;
}

const ACCESS_LABEL: Record<string, string> = {
  open: 'Open access',
  subscription: 'Subscription',
  restricted: 'Restricted access',
  unknown: 'Access unknown',
};

export default function SourceCard({ source, sourceVersion, permissions, loading, error, onInspect, onAddEvidence, onRequestReview }: SourceCardProps) {
  if (loading) {
    return (
      <div role="status" aria-busy="true" className={`rounded-md border ${sourceCardTokens.border} ${sourceCardTokens.background} p-4`} aria-label="Loading source">
        <Skeleton lines={3} />
      </div>
    );
  }
  if (error) {
    return (
      <div className={`rounded-md border ${sourceCardTokens.border} ${sourceCardTokens.background} p-4`}>
        <Alert tone="error" title="Source could not be loaded">{error}</Alert>
      </div>
    );
  }

  const { state, notice } = resolveSourceState(source, sourceVersion, permissions);
  const id = primaryIdentifier(source);
  const bodyDenied = state === 'restricted' || state === 'embargoed';
  const actionBtn =
    'inline-flex min-h-11 items-center rounded-sm bg-surface px-3 py-2 font-sans text-sm font-medium text-brand transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

  return (
    <article aria-label={sourceCardLabel(source)} className={`rounded-md border ${sourceCardTokens.border} ${sourceCardTokens.background} p-4`}>
      {notice ? (
        <div className="mb-3">
          <Alert tone={state === 'retracted' ? 'error' : 'warning'} title={state === 'retracted' ? 'Retraction notice' : 'Integrity notice'}>{notice}</Alert>
        </div>
      ) : null}

      <p className={`flex items-center gap-2 font-sans text-[0.8125rem] font-semibold uppercase tracking-[0.04em] ${sourceCardTokens.metadata}`}>
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${sourceCardTokens.accentDot}`} />
        {source.sourceType} · {source.language} · v{sourceVersion.versionLabel}
      </p>

      {bodyDenied ? (
        <p className={`mt-2 font-sans text-sm ${sourceCardTokens.metadata}`}>Metadata hidden — {state}.</p>
      ) : (
        <>
          <h3 className={`mt-2 text-balance font-serif text-[1.5rem] font-medium leading-[1.2] tracking-[-0.015em] ${sourceCardTokens.title}`}>
            {source.title}
          </h3>
          {source.translatedTitle ? <p className={`mt-1 font-sans text-sm ${sourceCardTokens.metadata}`}>Translated title: {source.translatedTitle}</p> : null}
          {source.transliteratedTitle ? <p className={`mt-1 font-sans text-sm ${sourceCardTokens.metadata}`}>Transliterated title: {source.transliteratedTitle}</p> : null}
          <p className={`mt-2 font-sans text-sm ${sourceCardTokens.metadata}`}>
            {source.contributors.map((c) => c.name + (c.orcid ? ` (${c.orcid})` : '')).join(', ')}
          </p>
          <dl className={`mt-3 grid grid-cols-1 gap-x-6 gap-y-1 font-sans text-sm sm:grid-cols-2 ${sourceCardTokens.metadata}`}>
            <div><dt className="inline font-semibold">Identifier: </dt><dd className="inline font-mono text-[0.8125rem]">{id ? `${id.scheme}: ${id.normalizedValue}` : 'None recorded'}</dd></div>
            <div><dt className="inline font-semibold">Access: </dt><dd className="inline">{ACCESS_LABEL[source.access]}</dd></div>
            <div><dt className="inline font-semibold">Integrity: </dt><dd className="inline">{sourceVersion.integrity.retractionStatus === 'none' ? 'Active' : sourceVersion.integrity.retractionStatus}</dd></div>
            {sourceVersion.publishedAt ? <div><dt className="inline font-semibold">Published: </dt><dd className="inline">{sourceVersion.publishedAt.slice(0, 10)}</dd></div> : null}
          </dl>
          <details className="mt-3">
            <summary className="cursor-pointer font-sans text-sm font-medium text-brand">Details</summary>
            <p className={`mt-2 font-sans text-sm ${sourceCardTokens.metadata}`}>
              Version {sourceVersion.versionLabel}
              {sourceVersion.checksum ? ` · checksum ${sourceVersion.checksum.slice(0, 12)}…` : ''}
              {sourceVersion.contentLocator ? ` · ${sourceVersion.contentLocator}` : ''}
            </p>
          </details>
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {onInspect ? <button type="button" className={actionBtn} onClick={() => onInspect(source.id)}>Inspect</button> : null}
        {onAddEvidence ? <button type="button" className={actionBtn} onClick={() => onAddEvidence(source.id)}>Add evidence</button> : null}
        {onRequestReview ? <button type="button" className={actionBtn} onClick={() => onRequestReview(source.id)}>Request review</button> : null}
      </div>
    </article>
  );
}
