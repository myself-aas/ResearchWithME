/**
 * AnnotationMarker — reme v3.1 §29 (editor annotation surface).
 *
 * Renders an annotation with its anchor state. Broken/drifted anchors are
 * marked visually and to assistive tech (`aria-describedby` + status text) —
 * never silently relocated. Unresolved anchors show the original quote so
 * the reader can re-locate it manually.
 */
import type { Annotation } from '@/lib/schemas/annotations';

export interface AnnotationMarkerProps {
  annotation: Annotation;
}

const STATE_LABEL: Record<Annotation['anchorState'], string> = {
  valid: 'Anchored',
  drifted: 'Anchor drifted — quote moved in this version',
  unresolved: 'Anchor unresolved — original location not found',
};

export default function AnnotationMarker({ annotation }: AnnotationMarkerProps) {
  const unresolved = annotation.anchorState === 'unresolved';
  const drifted = annotation.anchorState === 'drifted';
  return (
    <aside
      className={`rounded-md border p-3 font-sans text-sm ${
        unresolved
          ? 'border-destructive bg-surface'
          : drifted
            ? 'border-trust-uncertain bg-surface'
            : 'border-line bg-surface'
      }`}
      aria-describedby={`anchor-state-${annotation.id}`}
    >
      <p className="text-text-primary">{annotation.body}</p>
      <p
        id={`anchor-state-${annotation.id}`}
        className={`mt-1 text-xs ${unresolved || drifted ? 'font-semibold text-destructive' : 'text-text-tertiary'}`}
      >
        {STATE_LABEL[annotation.anchorState]}
        {unresolved ? (
          <>
            {' '}Original quote: <q className="italic">{annotation.anchor.textQuote.exact}</q>
          </>
        ) : null}
      </p>
    </aside>
  );
}
