import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import ProfileStrength from '@/components/engagement/ProfileStrength';
import { SIGNAL_WEIGHTS, type EngagementSignals } from '@/lib/engagement/signals';

// next/link is shimmed to react-router-dom in this suite; internal hrefs need a Router context.
const render = (signals: EngagementSignals) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <ProfileStrength signals={signals} />
    </MemoryRouter>,
  );

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

const weightSum = (s: EngagementSignals) =>
  (Object.keys(SIGNAL_WEIGHTS) as Array<keyof typeof SIGNAL_WEIGHTS>).reduce(
    (acc, key) => acc + (s[key] ? SIGNAL_WEIGHTS[key] : 0),
    0,
  );

describe('ProfileStrength — the number is the number', () => {
  it('all-false ⇒ 0 and the signup-step CTA (lowest weight, earliest order)', () => {
    const html = render(ALL_FALSE);
    expect(html).toContain('aria-valuenow="0"');
    expect(html).toContain('>0/100<');
    expect(html).toContain('Confirm your email address');
    expect(html).toContain('href="/login"');
  });

  it('identityLinked only ⇒ 20', () => {
    const html = render({ ...ALL_FALSE, identityLinked: true });
    expect(html).toContain('aria-valuenow="20"');
    expect(html).toContain('>20/100<');
  });

  it('every 64 signal combination reports exactly the documented weight sum', () => {
    for (let mask = 0; mask < 64; mask++) {
      const signals: EngagementSignals = {
        emailVerified: Boolean(mask & 1),
        identityLinked: Boolean(mask & 2),
        applicationApproved: Boolean(mask & 4),
        firstDraftSaved: Boolean(mask & 8),
        firstSubmission: Boolean(mask & 16),
        firstArticlePublished: Boolean(mask & 32),
      };
      const html = render(signals);
      expect(html).toContain(`aria-valuenow="${weightSum(signals)}"`);
    }
  });

  it('complete set ⇒ 100, data-complete, "You\'re publishable", and no next-step CTA', () => {
    const html = render(ALL_TRUE);
    expect(html).toContain('aria-valuenow="100"');
    expect(html).toContain('data-complete="true"');
    expect(html).toContain('publishable');
    expect(html).toContain('/dashboard/writing');
    expect(html).not.toContain('Confirm your email address');
    expect(html).not.toContain('Submit your first article');
  });

  it('incomplete sets carry data-complete="false" and always show one next step', () => {
    const html = render({ ...ALL_TRUE, firstArticlePublished: false });
    expect(html).toContain('data-complete="false"');
    expect(html).toContain('Publish your first article');
  });

  it('never hardcodes a score literal — the meter derives from the Task-8 weights', () => {
    const source = readFileSync(join(process.cwd(), 'components/engagement/ProfileStrength.tsx'), 'utf8');
    // e.g. aria-valuenow={20} or "aria-valuenow=\"20\"" would be a lie by construction
    expect(source).not.toMatch(/aria-valuenow=["'{]?\s*\d/);
    expect(source).not.toMatch(/data-complete=["'{]?\s*true\s*$/m);
  });
});
