/**
 * IntegrityNotice — πeme v3.1 §25 (stage 3, beta).
 *
 * Retraction/correction banner. The original version is always preserved;
 * the notice states what happened, which dependents are marked for review,
 * and whether publication is blocked. Renders BEFORE ordinary metadata.
 * Props: event: IntegrityEvent, affectedCount, publicationBlocked.
 * Screen reader: role="alert" for retraction, role="status" otherwise.
 * Token mapping: trust/destructive semantic tokens + text label (never color alone).
 * Tests: integrity-notice in dialogue.test.ts.
 */
import type { IntegrityEvent } from '@/lib/schemas/scholarly';
import Alert from '@/components/ui/Alert';

export interface IntegrityNoticeProps {
  event: IntegrityEvent;
  affectedCount: number;
  publicationBlocked?: boolean;
}

const TITLE: Record<string, string> = {
  retraction: 'Retraction',
  correction: 'Correction',
  'expression-of-concern': 'Expression of concern',
  'investigation-opened': 'Investigation opened',
};

export default function IntegrityNotice({ event, affectedCount, publicationBlocked = false }: IntegrityNoticeProps) {
  const isRetraction = event.eventType === 'retraction';
  return (
    <div role={isRetraction ? 'alert' : 'status'}>
      <Alert
        tone={isRetraction ? 'error' : 'warning'}
        title={`${TITLE[event.eventType] ?? 'Integrity event'} — original version preserved`}
      >
        Recorded {event.at.slice(0, 10)} by {event.recordedBy.slice(0, 8)}…. {affectedCount} dependent object(s) marked for review.
        {publicationBlocked ? ' Publication is blocked until impact is resolved.' : ''}
      </Alert>
    </div>
  );
}
