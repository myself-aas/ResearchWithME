'use client';

/**
 * ReadingStreak — the reader's honest consecutive-day count.
 *
 * Signed-out visitors never see engagement chrome: renders `null` until the
 * session hydrates, and `null` for anyone without a session. Zero events is
 * shown truthfully as 0 with a one-line prompt, never as a bigger invented
 * number. No animation loop; `data-reduced="true"` under reduced motion.
 *
 * Data comes from the server (`events`, UTC `day` strings) — this component
 * does no fetching and no guessing.
 */
import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { useSession } from '@/lib/supabase/use-session';
import { honestStreak } from '@/lib/engagement/signals';
import GoalRing from '@/components/engagement/GoalRing';

export interface ReadingStreakProps {
  events: ReadonlyArray<{ day: string }>;
  /** UTC day, `YYYY-MM-DD` — passed in so the render is deterministic. */
  today: string;
  /** Optional personal goal; the ring renders only when set. */
  goalDays?: number;
  className?: string;
}

export default function ReadingStreak({ events, today, goalDays, className }: ReadingStreakProps) {
  const { user, hydrated } = useSession();
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  if (!hydrated || !user) return null;

  const streak = honestStreak(events, today);
  const hasEvents = events.length > 0;

  return (
    <div
      role="status"
      aria-label={`Reading streak: ${streak} ${streak === 1 ? 'day' : 'days'}`}
      data-reduced={reduced ? 'true' : 'false'}
      className={className ?? 'inline-flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2'}
    >
      <Flame aria-hidden="true" className={`h-5 w-5 shrink-0 ${streak > 0 ? 'text-action-primary' : 'text-text-tertiary'}`} />
      <span className="min-w-0">
        <span className="block font-sans text-sm font-semibold text-text-primary">
          {streak} {streak === 1 ? 'day' : 'days'} reading streak
        </span>
        <span className="block font-sans text-xs text-text-secondary">
          {hasEvents
            ? streak > 0
              ? 'Keep it alive — open one review today.'
              : 'Streak paused — read today to start it again.'
            : 'Read your first review today to start a streak.'}
        </span>
      </span>
      {typeof goalDays === 'number' && goalDays > 0 ? (
        <GoalRing completed={Math.min(streak, goalDays)} target={goalDays} label="Reading goal this month" size={48} />
      ) : null}
    </div>
  );
}
