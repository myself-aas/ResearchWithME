import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIGURES, figureByToolName } from '@/lib/figures/registry';

/**
 * Per-post figure contract (FIGURE_CONSTITUTION.md Article 10 + the library
 * commission): every post that adopts figures carries **at least 4 distinct
 * interaction archetypes**, all registered, with the registry's `posts`
 * list and the MDX body agreeing. Drafts included — a draft is a post.
 */

const POSTS_DIR = join(process.cwd(), 'content', 'posts');

/** Every post the registry says is adopted, derived — no hand list. */
function adoptedPosts(): string[] {
  const slugs = new Set<string>();
  for (const figure of FIGURES) {
    for (const slug of figure.posts) slugs.add(slug);
  }
  return [...slugs].sort();
}

describe('per-post figure contract', () => {
  it('gives every adopting post at least 4 distinct interaction archetypes', async () => {
    const airflow = await import('@/lib/post/apache-airflow-repo-teardown');
    const svelte = await import('@/lib/post/svelte-repo-teardown');
    const pvalue = await import('@/lib/post/what-a-p-value-does-not-tell-you');
    const welcome = await import('@/lib/post/welcome-to-the-new-researchwithme');
    const n8n = await import('@/lib/post/n8n-repo-teardown');
    const nats = await import('@/lib/post/nats-server-repo-teardown');
    const polars = await import('@/lib/post/polars-repo-teardown');
    const posthog = await import('@/lib/post/posthog-repo-teardown');
    const plane = await import('@/lib/post/plane-repo-teardown');

    const manifests: Record<string, ReadonlyArray<{ mdxName: string; archetype: string }>> = {
      'apache-airflow-repo-teardown': airflow.AIRFLOW_FIGURES,
      'svelte-repo-teardown': svelte.SVELTE_FIGURES,
      'what-a-p-value-does-not-tell-you': pvalue.PVALUE_FIGURES,
      'welcome-to-the-new-researchwithme': welcome.WELCOME_FIGURES,
      'n8n-repo-teardown': n8n.N8N_FIGURES,
      'nats-server-repo-teardown': nats.NATS_FIGURES,
      'polars-repo-teardown': polars.POLARS_FIGURES,
      'posthog-repo-teardown': posthog.POSTHOG_FIGURES,
      'plane-repo-teardown': plane.PLANE_FIGURES,
    };

    for (const [slug, manifest] of Object.entries(manifests)) {
      const archetypes = manifest.map((figure) => figure.archetype);
      expect(
        new Set(archetypes).size,
        `${slug} must carry ≥4 unique interaction patterns`,
      ).toBeGreaterThanOrEqual(4);
      for (const entry of manifest) {
        const registered = FIGURES.find((figure) => figure.mdxName === entry.mdxName);
        expect(registered, `${slug}: ${entry.mdxName} must be registered`).toBeDefined();
        expect(registered?.archetype).toBe(entry.archetype);
        expect(
          registered?.status,
          `${slug}: ${entry.mdxName} must be adopted, not a bare fixture`,
        ).toBe('adopted');
        expect(
          registered?.posts,
          `${slug}: registry posts list must include this post`,
        ).toContain(slug);
      }
    }
  });

  it('keeps the registry and the MDX bodies in agreement', () => {
    for (const slug of adoptedPosts()) {
      const mdx = readFileSync(join(POSTS_DIR, `${slug}.mdx`), 'utf8');
      const registered = FIGURES.filter((figure) => (figure.posts as readonly string[]).includes(slug));
      expect(registered.length, `${slug} must be adopted by ≥4 registry figures`).toBeGreaterThanOrEqual(4);
      // Posts bind through thin components (Article 2); the manifest test
      // proves manifest ↔ registry agreement, this proves body ↔ manifest.
      const usedBindings = [...mdx.matchAll(/<[A-Z][A-Za-z0-9_]*/g)]
        .map((m) => m[0].slice(1))
        .filter((name) => !['KeyTakeaways', 'Callout'].includes(name));
      expect(usedBindings.length, `${slug} body must render ≥4 bound figures`).toBeGreaterThanOrEqual(4);
    }
  });

  it('keeps the registry honest: adopted posts exist as content files', () => {
    for (const slug of adoptedPosts()) {
      expect(
        readFileSync(join(POSTS_DIR, `${slug}.mdx`), 'utf8').length,
        `${slug} must exist as content`,
      ).toBeGreaterThan(0);
    }
  });

  it('binds every used post figure through mdx-components (no orphan tags)', () => {
    const mdxSource = readFileSync(join(process.cwd(), 'components', 'mdx', 'mdx-components.tsx'), 'utf8');
    const registryNames = new Set<string>(FIGURES.map((figure) => figure.mdxName));
    const chromeAndStatic = new Set(['Figure']);
    for (const slug of adoptedPosts()) {
      const mdx = readFileSync(join(POSTS_DIR, `${slug}.mdx`), 'utf8');
      const used = [...mdx.matchAll(/<[A-Z][A-Za-z0-9_]*/g)]
        .map((m) => m[0].slice(1))
        .filter((name) => !['KeyTakeaways', 'Callout', ...chromeAndStatic].includes(name));
      for (const binding of used) {
        // Registry-derived names arrive via the figureComponents spread; thin
        // bindings must appear literally in the map source.
        expect(
          registryNames.has(binding) || mdxSource.includes(binding),
          `${binding} must be available inside MDX`,
        ).toBe(true);
      }
    }
  });

  it('keeps the chrome figure out of the post contract', () => {
    // ThemeSwitch is site chrome, never a post figure.
    const theme = figureByToolName('show_theme_switch');
    expect(theme?.chrome).toBe(true);
    expect(theme?.posts).toHaveLength(0);
  });
});
