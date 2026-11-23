import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Value-first / honest-defaults contract (plan task: defaults & value-first audit).
 *
 * The platform is open: reviews are readable without an account. Sign-in asks
 * for the reader's email only after they have seen the value. These assertions
 * pin the copy and the wizard's initial state so a future edit cannot sneak
 * back pre-checked consent or interposed-wall phrasing.
 */

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

const VALUE_FIRST = 'Read open, citation-first reviews';
const BANNED = ['sign up to continue', 'create an account to see', 'required to view'];

describe('login — value-first framing, no interposed wall', () => {
  const login = read('components/auth/LoginForm.tsx');

  it('carries the value-first sentence above the form', () => {
    expect(login).toContain(VALUE_FIRST);
  });

  it('contains none of the banned interposed-wall phrases (case-insensitive)', () => {
    const lower = login.toLowerCase();
    for (const phrase of BANNED) {
      expect(lower).not.toContain(phrase);
    }
  });
});

describe('apply-to-write — invite-after-value framing', () => {
  const access = read('app/dashboard/access/page.tsx');

  it('leads with the value, invites the application second', () => {
    expect(access).toContain(VALUE_FIRST);
  });
});

describe('contribute wizard — honest initial state', () => {
  const wizard = read('components/v34/ContributeWizard.tsx');

  it('AI-review consent starts unchecked (no pre-checked consent)', () => {
    expect(wizard).toMatch(/const \[aiHumanReviewed, setAiHumanReviewed\] = useState(?:<[^>]+>)?\(false\)/);
  });

  it('AI assistance declaration starts unchecked', () => {
    expect(wizard).toMatch(/const \[usedAi, setUsedAi\] = useState(?:<[^>]+>)?\(false\)/);
  });

  it('retraction acknowledgement starts unchecked', () => {
    expect(wizard).toMatch(/const \[retractionAddressed, setRetractionAddressed\] = useState(?:<[^>]+>)?\(false\)/);
  });

  it('topics and tags are not pre-filled (no phantom Machine Learning defaults)', () => {
    expect(wizard).toMatch(/const \[topicsInput, setTopicsInput\] = useState(?:<[^>]+>)?\(''\)/);
    expect(wizard).toMatch(/const \[tagsInput, setTagsInput\] = useState(?:<[^>]+>)?\(''\)/);
  });

  it('AI provider is not pre-filled — the writer declares what they actually used', () => {
    expect(wizard).toMatch(/const \[aiProvider, setAiProvider\] = useState(?:<[^>]+>)?\(''\)/);
  });
});
