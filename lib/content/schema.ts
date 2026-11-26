/**
 * Frontmatter contract for `content/posts/*.mdx`.
 *
 * Frontmatter is validated at read time with Zod. An invalid file fails the
 * build with the file name and the offending field instead of rendering a
 * half-formed page, which is the whole point of keeping content in git.
 */
import { z } from 'zod';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** `gray-matter` hands YAML dates over as `Date`; authored strings stay strings. */
const dateish = z
  .union([z.string().min(1), z.date()])
  .transform((value, ctx) => {
    const raw = value instanceof Date ? value.toISOString() : value.trim();
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : raw.slice(0, 10);
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({ code: 'custom', message: `"${raw}" is not a valid date (use YYYY-MM-DD)` });
      return z.NEVER;
    }
    return iso;
  });

const tag = z
  .string()
  .trim()
  .min(1, 'Tags cannot be empty')
  .max(40, 'Keep tags under 40 characters')
  .transform((value) => value.toLowerCase());

export const frontmatterSchema = z
  .object({
    /** Post title, rendered as the <h1>. */
    title: z.string().trim().min(1, 'A title is required').max(140, 'Keep titles under 140 characters'),
    /** Meta description, feed summary, and card blurb. */
    description: z
      .string()
      .trim()
      .min(20, 'Write at least 20 characters so cards and search results have something to show')
      .max(280, 'Keep descriptions under 280 characters'),
    /** Publication date, YYYY-MM-DD. */
    date: dateish,
    /** Optional last-revised date, YYYY-MM-DD. */
    updated: dateish.optional(),
    /** Topic tags, normalised to lowercase, de-duplicated by the loader. */
    tags: z.array(tag).max(12, 'Twelve tags is plenty').default([]),
    /** Optional series name; posts in a series are linked together. */
    series: z.string().trim().max(80).optional(),
    /** Cover image, relative to /public or an absolute https URL. */
    cover: z.string().trim().min(1).optional(),
    /** Alt text for the cover; required whenever a cover is set. */
    coverAlt: z.string().trim().max(200).optional(),
    /** How the cover is displayed on the post page. 'hero' overlays title/meta on the image. */
    coverStyle: z.enum(['default', 'hero']).default('default'),
    /** Feature this post at the top of the home page. */
    featured: z.boolean().default(false),
    /** Drafts render in development only and never reach a production build. */
    draft: z.boolean().default(false),
    /** Optional slug override; defaults to the file name. */
    slug: z
      .string()
      .trim()
      .regex(SLUG_PATTERN, 'Use lowercase letters, numbers, and hyphens')
      .optional(),
    /** Optional canonical URL when this post was first published elsewhere. */
    canonical: z.string().url('Canonical must be an absolute URL').optional(),
    /** Render the table of contents on the post page. */
    toc: z.boolean().default(true),
    /**
     * Questions answered on the page. Rendered as a visible FAQ section and
     * mirrored into FAQPage structured data — never emitted on its own.
     */
    faq: z
      .array(
        z.object({
          question: z.string().trim().min(8, 'Ask a real question').max(160),
          answer: z.string().trim().min(20, 'Answer in a sentence or two').max(600),
        }),
      )
      .max(8)
      .default([]),
  })
  .strict();

export type Frontmatter = z.infer<typeof frontmatterSchema>;
