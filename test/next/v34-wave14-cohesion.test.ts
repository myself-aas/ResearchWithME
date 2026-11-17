import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ResearchNetworkBridge } from '@/components/v34/ResearchNetworkBridge';
import { GET as getFeed } from '@/app/api/feed/route';

describe('v3.4 Wave 14 — Legacy-to-v3.4 Platform Cohesion & Runtime Experiment Wiring', () => {
  it('renders ResearchNetworkBridge with primary contribution CTA and all canonical v3.4 entry points', () => {
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(ResearchNetworkBridge)),
    );
    expect(html).toContain('Research Contribution Network');
    expect(html).toContain('href="/contribute"');
    expect(html).toContain('href="/feed"');
    expect(html).toContain('href="/sources"');
    expect(html).toContain('href="/evidence"');
    expect(html).toContain('href="/tools"');
    expect(html).toContain('href="/editor"');
    expect(html).toContain('href="/research-os"');
  });

  it('attaches deterministic privacy-safe experiment variant and feature flags on GET /api/feed', async () => {
    const req1 = new Request('http://localhost/api/feed?bucketKey=anon-researcher-42', {
      headers: { 'x-experiment-subject': 'anon-researcher-42' },
    });
    const req2 = new Request('http://localhost/api/feed?bucketKey=anon-researcher-42', {
      headers: { 'x-experiment-subject': 'anon-researcher-42' },
    });
    const res1 = await getFeed(req1);
    const res2 = await getFeed(req2);
    expect(res1.status).toBe(200);
    const data1 = (await res1.json()) as {
      items: unknown[];
      experiments: Array<{ experimentId: string; variant: string; bucket: number }>;
      featureFlags: Record<string, boolean>;
    };
    const data2 = (await res2.json()) as {
      experiments: Array<{ experimentId: string; variant: string; bucket: number }>;
    };

    expect(Array.isArray(data1.items)).toBe(true);
    expect(data1.experiments).toHaveLength(1);
    expect(data1.experiments[0].experimentId).toBe('exp-feed-contribution-cta-v1');
    expect(['control', 'contextual-source-cta']).toContain(data1.experiments[0].variant);
    expect(data1.experiments[0]).toEqual(data2.experiments[0]);
    expect(typeof data1.featureFlags).toBe('object');
  });
});
