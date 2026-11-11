/**
 * Deterministic fixtures for the editorial CMS API tests. Kept out of the
 * route tests so the shapes stay stable if the suite grows.
 */
import type { ProfileRow } from '@/lib/author-directory-core';

/**
 * The harness's profile fixture rows. The public author-directory projection
 * (author-directory-core's ProfileRow) omits the attribution columns, so the
 * fixture type carries them explicitly — the fake client ignores the SELECT
 * list and returns rows whole, exactly as the route under test expects.
 */
export type ProfileFixture = ProfileRow & {
  user_id: string;
  published: boolean;
};

export const MAYA_PROFILE: ProfileFixture = {
  user_id: '10000000-0000-4000-8000-000000000071',
  slug: 'maya-lin',
  display_name: 'Maya Lin',
  published: true,
  bio: 'Research engineer.',
  role: 'Editor',
  domain: 'Scholarly Tech',
  institution: 'ResearchWithMe',
  avatar_url: '',
  orcid: '0000-0002-1825-0097',
  github: '',
  website: '',
  scholar: '',
  created_at: '2026-01-01T00:00:00.000Z',
};

export const HIROSHI_UNPUBLISHED: ProfileFixture = {
  user_id: '10000000-0000-4000-8000-000000000072',
  slug: 'hiroshi-tanaka',
  display_name: 'Hiroshi Tanaka',
  published: false,
  bio: 'Works on retrieval.',
  role: 'Researcher',
  domain: 'AI & Systems',
  institution: 'Example Institute',
  avatar_url: '',
  orcid: '',
  github: '',
  website: '',
  scholar: '',
  created_at: '2026-01-02T00:00:00.000Z',
};

/** Draft posts need only a title and an author; published posts need more. */
export function validPostBody(overrides: Record<string, unknown> = {}) {
  return {
    title: 'A serious review of inference engines',
    slug: 'a-serious-review-of-inference-engines',
    content: 'Deterministic body copy for the fixture article. '.repeat(12),
    summary:
      'A careful summary of the inference engine under review, covering how it behaves under load.',
    status: 'draft',
    category: 'STEM & Tech',
    format: 'Paper Review',
    authorId: 'maya-lin',
    // Deliberately a name the profile does NOT carry: the stored byline must
    // come from the profile, never from this value.
    authorName: 'Spoofed Byline',
    keyTakeaways: ['An engine tuned for throughput fails differently under tail latency.'],
    tags: ['inference', 'vllm'],
    ...overrides,
  };
}

/** A body that passes the stricter published-article requirements. */
export function publishedPostBody(overrides: Record<string, unknown> = {}) {
  return validPostBody({
    status: 'published',
    content: 'Published body copy with enough substance to pass validation. '.repeat(8),
    summary:
      'A published summary long enough to meet the forty character minimum for the public feed.',
    ...overrides,
  });
}
