import { describe, it, expect } from 'vitest';
import { formatLinkedInPost, truncateForLinkedIn } from '@/lib/linkedin/content-formatter';

describe('Content Formatter', () => {
  const mockArticle = {
    title: 'Inside vLLM & PagedAttention: Why Memory Fragmentation Was Killing LLM Serving',
    summary: 'Before vLLM, serving transformers at scale suffered from up to 80% wasted GPU VRAM due to sequential pre-allocation of the KV cache.',
    url: 'https://researchwith.me/post/inside-vllm-and-paged-attention',
    coverImage: 'https://researchwith.me/images/folio-code.jpeg',
    authorName: 'Maya Lin',
    category: 'GitHub Repo Teardowns',
    tags: ['CUDA', 'vLLM', 'GPU Inference', 'Systems Engineering', 'Performance'],
    doi: '10.5555/rwm.post-1',
  };

  it('formats post with all required elements', () => {
    const formatted = formatLinkedInPost(mockArticle);
    
    expect(formatted.text).toContain('📖 New Research Review: Inside vLLM & PagedAttention');
    expect(formatted.text).toContain('Before vLLM, serving transformers at scale suffered');
    expect(formatted.text).toContain('DOI: https://doi.org/10.5555/rwm.post-1');
    expect(formatted.text).toContain('Read the full review: https://researchwith.me/post/inside-vllm-and-paged-attention');
    expect(formatted.text).toContain('By Maya Lin | GitHub Repo Teardowns');
    expect(formatted.text).toContain('#ResearchWithMe');
    expect(formatted.text).toContain('#OpenScience');
    expect(formatted.hashtags).toContain('#CUDA');
    expect(formatted.hashtags).toContain('#vLLM');
    expect(formatted.hashtags).toContain('#GPUInference');
  });

  it('truncates content exceeding 3000 characters', () => {
    const longArticle = {
      ...mockArticle,
      summary: 'A'.repeat(3000),
    };
    const formatted = formatLinkedInPost(longArticle);
    expect(formatted.text.length).toBeLessThanOrEqual(3000);
    expect(formatted.text).toContain('...');
    expect(formatted.text).toContain('Read the full review:');
  });

  it('handles missing cover image', () => {
    const noImageArticle = { ...mockArticle, coverImage: undefined };
    const formatted = formatLinkedInPost(noImageArticle);
    expect(formatted.text).not.toContain('[Image]');
    expect(formatted.media).toBeUndefined();
  });

  it('truncateForLinkedIn preserves word boundaries', () => {
    const text = 'This is a test sentence that should be truncated at word boundary';
    const truncated = truncateForLinkedIn(text, 30);
    expect(truncated.length).toBeLessThanOrEqual(30);
    expect(truncated).not.toMatch(/\w+$/); // Doesn't end mid-word
    expect(truncated).toContain('...');
  });

  it('limits hashtags to 5', () => {
    const manyTagsArticle = {
      ...mockArticle,
      tags: ['Tag1', 'Tag2', 'Tag3', 'Tag4', 'Tag5', 'Tag6', 'Tag7'],
    };
    const formatted = formatLinkedInPost(manyTagsArticle);
    const hashtagCount = (formatted.text.match(/#\w+/g) || []).length;
    expect(hashtagCount).toBeLessThanOrEqual(5);
  });
});