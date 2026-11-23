import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_ORDER,
  SIGNAL_WEIGHTS,
  honestStreak,
  nextStep,
  profileStrength,
  type EngagementSignals,
  type EngagementSignalKey,
} from '@/lib/engagement/signals';

const ALL_FALSE: EngagementSignals = {
  emailVerified: false,
  identityLinked: false,
  applicationApproved: false,
  firstDraftSaved: false,
  firstSubmission: false,
  firstArticlePublished: false,
};
const ALL_TRUE: EngagementSignals = {
  emailVerified: true,
  identityLinked: true,
  applicationApproved: true,
  firstDraftSaved: true,
  firstSubmission: true,
  firstArticlePublished: true,
};

/** Independent expectation: plain sum of the documented weights. */
const expectedStrength = (s: EngagementSignals) =>
  (s.emailVerified ? 15 : 0) +
  (s.identityLinked ? 20 : 0) +
  (s.applicationApproved ? 15 : 0) +
  (s.firstDraftSaved ? 20 : 0) +
  (s.firstSubmission ? 15 : 0) +
  (s.firstArticlePublished ? 15 : 0);

describe('profileStrength', () => {
  it('all-false is exactly 0', () => {
    expect(profileStrength(ALL_FALSE)).toBe(0);
  });

  it('all-true is exactly 100', () => {
    expect(profileStrength(ALL_TRUE)).toBe(100);
    expect(SIGNAL_WEIGHTS.emailVerified + SIGNAL_WEIGHTS.identityLinked + SIGNAL_WEIGHTS.applicationApproved +
      SIGNAL_WEIGHTS.firstDraftSaved + SIGNAL_WEIGHTS.firstSubmission + SIGNAL_WEIGHTS.firstArticlePublished).toBe(100);
  });

  it('every one of the 64 signal combinations scores exactly the documented weight sum', () => {
    for (let mask = 0; mask < 64; mask++) {
      const signals: EngagementSignals = {
        emailVerified: Boolean(mask & 1),
        identityLinked: Boolean(mask & 2),
        applicationApproved: Boolean(mask & 4),
        firstDraftSaved: Boolean(mask & 8),
        firstSubmission: Boolean(mask & 16),
        firstArticlePublished: Boolean(mask & 32),
      };
      expect(profileStrength(signals)).toBe(expectedStrength(signals));
    }
  });
});

describe('nextStep', () => {
  it('all-false points at verifying email, the lowest-weight earliest step', () => {
    expect(nextStep(ALL_FALSE)).toEqual({ label: 'Confirm your email address', href: '/login' });
  });

  it('all-true is null — nothing left to nudge', () => {
    expect(nextStep(ALL_TRUE)).toBeNull();
  });

  it('prefers the lowest-weight incomplete step over onboarding order', () => {
    // identityLinked (20) is incomplete but applicationApproved (15) weighs less,
    // so the application step is surfaced first.
    const signals: EngagementSignals = { ...ALL_FALSE, emailVerified: true };
    expect(nextStep(signals)).toEqual({ label: 'Complete your writer application', href: '/dashboard/access' });
  });

  it('ties between weight-15 steps break by onboarding order (emailVerified before firstSubmission)', () => {
    // applicationApproved done too, so emailVerified is the only weight-15 step left before firstSubmission.
    const signals: EngagementSignals = {
      ...ALL_FALSE,
      identityLinked: true,
      applicationApproved: true,
      firstDraftSaved: true,
    };
    expect(nextStep(signals)).toEqual({ label: 'Confirm your email address', href: '/login' });
  });

  it('only identityLinked and firstDraftSaved incomplete (weight 20 each) → identityLinked (earlier)', () => {
    const signals: EngagementSignals = {
      emailVerified: true,
      identityLinked: false,
      applicationApproved: true,
      firstDraftSaved: false,
      firstSubmission: true,
      firstArticlePublished: true,
    };
    expect(nextStep(signals)).toEqual({ label: 'Connect a verified identity', href: '/dashboard/access' });
  });

  it('walks the ladder deterministically: all weight-15 steps (onboarding order), then weight-20 steps', () => {
    const completions: EngagementSignalKey[] = [
      'emailVerified', 'applicationApproved', 'firstSubmission', 'firstArticlePublished',
      'identityLinked', 'firstDraftSaved',
    ];
    const expectedLabels = [
      'Confirm your email address',
      'Complete your writer application',
      'Submit your first article',
      'Publish your first article',
      'Connect a verified identity',
      'Write your first draft',
    ];
    let signals: EngagementSignals = { ...ALL_FALSE };
    for (let i = 0; i < completions.length; i++) {
      expect(nextStep(signals)?.label).toBe(expectedLabels[i]);
      signals = { ...signals, [completions[i]]: true };
    }
    expect(nextStep(signals)).toBeNull();
  });
});

describe('honestStreak', () => {
  const today = '2026-11-23';

  it('empty events ⇒ 0', () => {
    expect(honestStreak([], today)).toBe(0);
  });

  it('counts consecutive days ending today, duplicates once', () => {
    const events = [
      { day: '2026-11-21' }, { day: '2026-11-21' }, { day: '2026-11-22' }, { day: '2026-11-23' },
    ];
    expect(honestStreak(events, today)).toBe(3);
  });

  it('a gap day breaks the run to 0 from the gap onward', () => {
    const events = [
      { day: '2026-11-19' }, { day: '2026-11-20' }, { day: '2026-11-22' }, { day: '2026-11-23' },
    ];
    expect(honestStreak(events, today)).toBe(2);
  });

  it('today missing ⇒ 0, even with a long past run', () => {
    const events = [
      { day: '2026-11-18' }, { day: '2026-11-19' }, { day: '2026-11-20' }, { day: '2026-11-21' }, { day: '2026-11-22' },
    ];
    expect(honestStreak(events, today)).toBe(0);
  });

  it('future dates are ignored', () => {
    const events = [
      { day: '2026-11-23' }, { day: '2026-11-24' }, { day: '2026-11-30' },
    ];
    expect(honestStreak(events, today)).toBe(1);
  });

  it('a full run that crosses a month boundary counts correctly', () => {
    const events = [
      { day: '2026-10-30' }, { day: '2026-10-31' }, { day: '2026-11-01' },
    ];
    expect(honestStreak(events, '2026-11-01')).toBe(3);
  });

  it('a full run across a year boundary counts correctly', () => {
    const events = [
      { day: '2025-12-30' }, { day: '2025-12-31' }, { day: '2026-01-01' },
    ];
    expect(honestStreak(events, '2026-01-01')).toBe(3);
  });

  it('malformed days never extend or start a streak', () => {
    const events = [
      { day: 'not-a-date' }, { day: '2026-02-31' }, { day: '2026-11-23' }, { day: '2026-11-2x' },
    ];
    expect(honestStreak(events, today)).toBe(1);
  });

  it('malformed today ⇒ 0', () => {
    expect(honestStreak([{ day: today }], 'today')).toBe(0);
  });

  it('a leap day is a real day', () => {
    const events = [
      { day: '2028-02-28' }, { day: '2028-02-29' },
    ];
    expect(honestStreak(events, '2028-02-29')).toBe(2);
  });

  it('onboarding order export is the documented walk', () => {
    expect(ONBOARDING_ORDER).toEqual([
      'emailVerified',
      'identityLinked',
      'applicationApproved',
      'firstDraftSaved',
      'firstSubmission',
      'firstArticlePublished',
    ]);
  });
});
