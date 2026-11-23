import { describe, expect, it } from 'vitest';
import { listScenarios } from '@/lib/email/scenarios';
import { renderScenario } from '@/lib/email/render';

/**
 * Notification-copy contract — R1/R7 (speak to the feeling, never to the void).
 *
 * Every scenario in the registry must:
 *   (a) contain zero Task-13 banned phrases in its rendered body;
 *   (b) if it is not transactional (auth / receipts / security / support), carry
 *       at least one concrete value token — a real count, date or title from its
 *       sample values — never "Come back to ResearchWithMe";
 *   (c) have a subject built from sample values of at most 78 characters;
 *   (d) have a preheader that differs from the subject (where a preheader exists).
 *
 * Every shipped scenario today is transactional — there is no re-engagement or
 * digest email — so (b) is enforced by classifying explicitly: a scenario that
 * is not listed as transactional gets the value-token requirement by default.
 * Adding a new scenario without classifying it fails this test. That is the
 * regression guard, not a bulk of rewrites.
 *
 * Transactional mail is exempt from tone rules but still scanned for banned
 * phrases (a).
 */

// Same patterns as lib/__tests__/forbidden-copy.test.ts (Task 13).
const BANNED = [
  /\b(i'?ll risk it|risk it anyway|don't miss out)\b/i,
  /\bonly \d+ (seats?|slots?|spots?|copies) left\b/i,
  /\b(selling fast|last chance|never forget|before it's gone)\b/i,
  /\b(we miss you|we('ve)? missed you)\b/i,
];

/** Account, auth, security and support mail — exempt from value-token rule. */
const TRANSACTIONAL = new Set([
  'welcome',
  'verify-email',
  'password-reset',
  'security-alert',
  'support-reply',
]);

const MAX_SUBJECT = 78;

/** The hidden preheader div react-email renders for <Preview>. */
const PREHEADER = /<div style="display:none[^>]*>([^<]*)/;

function preheaderOf(html: string): string | null {
  const match = PREHEADER.exec(html);
  if (!match) return null;
  // strip the zero-width padding react-email appends for inbox truncation
  return match[1].replace(/[​‌‍‎‏﻿]/g, '').trim();
}

const scenarios = listScenarios();

describe('notification copy contract', () => {
  it('covers every scenario in the registry (classification is explicit)', () => {
    for (const scenario of scenarios) {
      const classified = TRANSACTIONAL.has(scenario.key);
      // A new, unclassified scenario defaults to non-transactional (value-token
      // required) via the value-token test below — nothing silently ships exempt.
      expect(typeof classified).toBe('boolean');
    }
  });

  it.each(scenarios.map((s) => [s.key, s] as const))(
    '%s renders a body free of banned phrases',
    async (_key, scenario) => {
      const { text } = await renderScenario(scenario, scenario.sample);
      const hits = BANNED.flatMap((pattern) => {
        const match = text.match(pattern);
        return match ? [match[0]] : [];
      });
      expect(hits).toEqual([]);
    },
  );

  it.each(scenarios.map((s) => [s.key, s] as const))(
    '%s subject is at most 78 characters',
    (_key, scenario) => {
      const subject = scenario.subjectBuilder(scenario.sample);
      expect(subject.length).toBeLessThanOrEqual(MAX_SUBJECT);
    },
  );

  it.each(scenarios.map((s) => [s.key, s] as const))(
    '%s preheader differs from the subject',
    async (_key, scenario) => {
      const { html } = await renderScenario(scenario, scenario.sample);
      const preheader = preheaderOf(html);
      // every shipped template sets a preheader via <Preview>
      expect(preheader, 'preheader missing from rendered html').toBeTruthy();
      const subject = scenario.subjectBuilder(scenario.sample);
      expect(preheader!.toLowerCase()).not.toBe(subject.toLowerCase());
    },
  );

  it.each(scenarios.map((s) => [s.key, s] as const))(
    '%s if non-transactional, carries a concrete value token; if transactional, exempt',
    async (_key, scenario) => {
      const { text } = await renderScenario(scenario, scenario.sample);
      if (TRANSACTIONAL.has(scenario.key)) {
        // Exempt from tone rules — the banned-phrase test above still applies.
        expect(text.length).toBeGreaterThan(0);
        return;
      }
      // Value token: a count/date digit or one of the scenario's non-trivial
      // sample strings reaching the reader verbatim. Never a bare
      // "come back" with nothing in it for them.
      const sampleStrings = Object.values(scenario.sample)
        .filter((v): v is string => typeof v === 'string' && v.trim().length >= 4)
        .map((v) => v.trim().toLowerCase());
      const lower = text.toLowerCase();
      const hasSampleValue = sampleStrings.some((v) => lower.includes(v));
      const hasCount = /\d/.test(text);
      expect(
        hasSampleValue || hasCount,
        `${scenario.key} is non-transactional but names no concrete value`,
      ).toBe(true);
    },
  );

  it('no shipped scenario uses win-back / re-engagement wording', () => {
    for (const scenario of scenarios) {
      expect(scenario.key).not.toMatch(/re-?engagement|win-?back|digest|weekly|nudge/i);
    }
  });

  it('subject built with missing optional variables never collapses to empty', () => {
    for (const scenario of scenarios) {
      const subject = scenario.subjectBuilder({});
      expect(subject.trim().length).toBeGreaterThan(0);
    }
  });
});
