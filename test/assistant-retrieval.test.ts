import { describe, expect, it } from 'vitest';
import type { SearchDoc } from '@/lib/content/types';
import {
  chunkDocs,
  routeFigure,
  chunkText,
  composeAnswer,
  lastUserText,
  retrievePassages,
  suggestPrompts,
} from '@/lib/assistant/retrieval';

function doc(overrides: Partial<SearchDoc> & Pick<SearchDoc, 'slug' | 'title' | 'text'>): SearchDoc {
  return {
    href: `/blog/${overrides.slug}`,
    description: `Description of ${overrides.title}`,
    tags: ['research'],
    date: '2026-03-04',
    readingTimeMinutes: 6,
    ...overrides,
  };
}

const essays: SearchDoc[] = [
  doc({
    slug: 'benchmark-that-did-not-survive',
    title: 'Reproducing a benchmark that did not survive',
    tags: ['benchmarks', 'reproducibility'],
    text:
      'The benchmark reported a 12x speedup that no one could reproduce later. ' +
      'The machine had turbo boost enabled, and the load generator shared a socket with the system under test. ' +
      'Reproducing a benchmark means pinning the clock, isolating the cores, and running the generator on another machine. ' +
      'Even then the numbers moved by four percent between runs. ' +
      'A benchmark that did not survive replication teaches more than one that did. ' +
      'Write the environment down before writing the claims down.',
  }),
  doc({
    slug: 'read-a-repository-before-you-run-it',
    title: 'Read a repository before you run it',
    tags: ['tooling', 'reproducibility'],
    text:
      'Reading a repository before you run it is the cheapest security review available. ' +
      'The install scripts run before you have read a single line of the code you asked for. ' +
      'Start with the manifest, then the install hooks, then the network surface. ' +
      'Most repositories are honest; the point is to check.',
  }),
];

describe('chunkText', () => {
  it('splits on sentence boundaries and groups into contiguous passages', () => {
    const chunks = chunkText(essays[0].text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // No chunk exceeds the passage cap, and none is a stray fragment.
      expect(chunk.length).toBeLessThanOrEqual(400);
      expect(chunk.length).toBeGreaterThanOrEqual(100);
    }
    // Reassembling the chunks preserves every sentence, in order.
    expect(chunks.join(' ')).toBe(essays[0].text.replace(/\s+/g, ' ').trim());
  });

  it('is deterministic', () => {
    expect(chunkText(essays[1].text)).toEqual(chunkText(essays[1].text));
  });

  it('returns an empty list for empty text', () => {
    expect(chunkText('')).toEqual([]);
  });
});

describe('chunkDocs', () => {
  it('tags every passage with its essay', () => {
    const corpus = chunkDocs(essays);
    expect(corpus.length).toBeGreaterThanOrEqual(essays.length);
    for (const passage of corpus) {
      const source = essays.find((essay) => essay.slug === passage.slug);
      expect(source).toBeDefined();
      expect(passage.href).toBe(source?.href);
      expect(passage.title).toBe(source?.title);
    }
  });
});

describe('retrievePassages', () => {
  it('finds passages about a benchmark that did not survive', () => {
    const hits = retrievePassages(essays, 'why did the benchmark not reproduce?');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].passage.slug).toBe('benchmark-that-did-not-survive');
    expect(hits[0].passage.text).toMatch(/benchmark/i);
  });

  it('returns nothing for a query the archive cannot support', () => {
    expect(retrievePassages(essays, 'quantum crochet patterns')).toEqual([]);
    expect(retrievePassages(essays, 'ab')).toEqual([]);
    expect(retrievePassages(essays, '')).toEqual([]);
  });

  it('caps how many essays and how many passages per essay an answer can quote', () => {
    const hits = retrievePassages(essays, 'reproducibility benchmarks repositories');
    for (const hit of hits) {
      expect(hit.siblings.length).toBeLessThanOrEqual(3);
    }
    expect(hits.length).toBeLessThanOrEqual(4);
  });
});

describe('composeAnswer', () => {
  it('quotes passages verbatim and links every source', () => {
    const hits = retrievePassages(essays, 'reading a repository before running it');
    expect(hits.length).toBeGreaterThan(0);
    const answer = composeAnswer('reading a repository before running it', hits);
    expect(answer).toContain(hits[0].passage.text);
    expect(answer).toContain(`[${hits[0].passage.title}](${hits[0].passage.href})`);
    expect(answer).toContain('Sources');
  });

  it('admits failure instead of improvising', () => {
    const answer = composeAnswer('quantum crochet', []);
    expect(answer).toMatch(/could not find/i);
    expect(answer).toMatch(/do not improvise/i);
    expect(answer).toContain('/search?q=quantum%20crochet');
  });

  it('points the fallback at the closest essay when there is one', () => {
    const closest = essays[0];
    const answer = composeAnswer('benchmark claims', [], closest);
    expect(answer).toContain(`[${closest.title}](${closest.href})`);
  });
});

describe('suggestPrompts', () => {
  it('derives starter prompts from the archive itself', () => {
    const prompts = suggestPrompts(essays);
    expect(prompts.length).toBe(3);
    expect(prompts[0]).toContain(essays[0].title);
    expect(prompts.some((prompt) => prompt.includes('reproducibility'))).toBe(true);
  });

  it('is deterministic', () => {
    expect(suggestPrompts(essays)).toEqual(suggestPrompts(essays));
  });
});

describe('lastUserText', () => {
  it('takes the last user message and joins its text parts', () => {
    expect(
      lastUserText([
        { role: 'user', content: [{ type: 'text', text: 'first question' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'first answer' }] },
        { role: 'user', content: [{ type: 'text', text: 'second ' }, { type: 'text', text: 'question' }] },
      ]),
    ).toBe('second question');
  });

  it('ignores trailing non-user messages and empty parts', () => {
    expect(
      lastUserText([
        { role: 'user', content: [{ type: 'text', text: 'the real question' }] },
        { role: 'assistant', content: [{ type: 'image', text: undefined }] },
      ]),
    ).toBe('the real question');
  });

  it('returns an empty string when there is no user message', () => {
    expect(lastUserText([{ role: 'assistant', content: [{ type: 'text', text: 'hello' }] }])).toBe('');
  });
});

describe('routeFigure', () => {
  it('routes masked-autoencoding questions to the reconstructor figure', () => {
    expect(routeFigure('explain the masked autoencoder objective')).toEqual({
      toolName: 'show_masked_patch_reconstructor',
      args: { initialRatio: 0.75 },
    });
    expect(routeFigure('what went into pretraining?')?.toolName).toBe('show_masked_patch_reconstructor');
  });

  it('routes seasonality questions to the scrubber figure', () => {
    expect(routeFigure('why four dates across seasons?')).toEqual({
      toolName: 'show_season_scrubber',
      args: { initialMonth: 5 },
    });
    expect(routeFigure('temporal sampling timeline')?.toolName).toBe('show_season_scrubber');
  });

  it('routes checkpoint and cost questions to the ladder figure', () => {
    expect(routeFigure('which checkpoint should I pick and how many GPUs?')).toEqual({
      toolName: 'show_checkpoint_ladder',
      args: { initialCheckpoint: '600m-tl' },
    });
    expect(routeFigure('model size 300M vs 600M')?.toolName).toBe('show_checkpoint_ladder');
  });

  it('routes nothing for ordinary retrieval questions', () => {
    expect(routeFigure('why did the benchmark not reproduce?')).toBeUndefined();
    expect(routeFigure('')).toBeUndefined();
  });

  it('is deterministic', () => {
    expect(routeFigure('masked pretraining')).toEqual(routeFigure('masked pretraining'));
  });
});

describe('routeFigure — registry-driven routing', () => {
  it('keeps the prototype figures keyword claims identical to the hand-written era', () => {
    expect(routeFigure('explain the masked autoencoder objective')).toMatchObject({
      toolName: 'show_masked_patch_reconstructor',
      args: { initialRatio: 0.75 },
    });
    expect(routeFigure('temporal sampling timeline')?.toolName).toBe('show_season_scrubber');
    expect(routeFigure('which checkpoint has the most parameters?')?.toolName).toBe('show_checkpoint_ladder');
  });

  it('routes architecture questions to the pipeline explorer', () => {
    expect(routeFigure('walk me through the architecture')).toEqual({
      toolName: 'show_prithvi_explorer',
      args: {},
    });
  });

  it('routes benchmark chart questions by dataset name', () => {
    expect(routeFigure('what does sen1floods11 show for floods?')?.toolName).toBe('show_flood_results_chart');
    expect(routeFigure('crop segmentation results')?.toolName).toBe('show_pastis_results_chart');
  });

  it('routes the library fixtures by their keywords', () => {
    expect(routeFigure('wipe between before and after')?.toolName).toBe('show_wipe_compare');
    expect(routeFigure('the accuracy latency trade-off')?.toolName).toBe('show_tradeoff_pad');
    expect(routeFigure('replay the leaderboard race over time')?.toolName).toBe('show_race_playback');
    expect(routeFigure('inspect the field with a lens')?.toolName).toBe('show_lens_peek');
    expect(routeFigure('the anatomy of the figure')?.toolName).toBe('show_hotspot_atlas');
    expect(routeFigure('sensitivity: what if the assumption fails?')?.toolName).toBe('show_assumption_switches');
    expect(routeFigure('quiz me on this essay')?.toolName).toBe('show_self_check_quiz');
  });

  it('returns the registry defaults as args, so empty tool calls still render', () => {
    const invocation = routeFigure('a side by side comparison, please');
    expect(invocation?.toolName).toBe('show_wipe_compare');
    expect(Object.keys(invocation?.args ?? {}).length).toBeGreaterThan(0);
  });

  it('routes nothing for ordinary retrieval questions', () => {
    expect(routeFigure('why did the benchmark not reproduce?')).toBeUndefined();
    expect(routeFigure('')).toBeUndefined();
  });
});
