import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DeferredDiscussion from '@/components/reader/DeferredDiscussion';

describe('deferred discussion', () => {
  it('exposes its fragment target before the discussion widget mounts', () => {
    const html = renderToStaticMarkup(<DeferredDiscussion postId="post-1" commentCount={0} />);
    expect(html).toContain('id="discussion"');
    expect(html).toContain('data-lazy-state="deferred"');
  });
});
