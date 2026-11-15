import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to define mocks before vi.mock is hoisted
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabasePublicClient: () => mockSupabase,
}));

vi.mock('@/lib/supabase/config', () => ({
  isSupabaseConfigured: true,
}));

import { logLinkedInEvent, getLinkedInMetrics } from '@/lib/linkedin/monitoring';

describe('LinkedIn Monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs post attempt event', async () => {
    mockSupabase.insert.mockResolvedValue({ error: null });

    await logLinkedInEvent({
      type: 'post_attempt',
      slug: 'test-article',
      status: 'success',
      postUrn: 'urn:li:share:123',
      timestamp: new Date().toISOString(),
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('linkedin_events');
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'post_attempt',
        slug: 'test-article',
        status: 'success',
        post_urn: 'urn:li:share:123',
      })
    );
  });

  it('logs post failure with error details', async () => {
    mockSupabase.insert.mockResolvedValue({ error: null });

    await logLinkedInEvent({
      type: 'post_attempt',
      slug: 'test-article',
      status: 'failed',
      error: 'Rate limited',
      timestamp: new Date().toISOString(),
    });

    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        error: 'Rate limited',
      })
    );
  });

  it('retrieves metrics for dashboard', async () => {
    // The monitoring code chains .eq().gte().order().limit() after .select()
    // So we need to mock the chain properly
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.gte.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);
    mockSupabase.limit.mockResolvedValue({
      data: [
        { type: 'post_attempt', status: 'success', created_at: '2026-01-15T10:00:00Z' },
        { type: 'post_attempt', status: 'success', created_at: '2026-01-15T11:00:00Z' },
        { type: 'post_attempt', status: 'failed', created_at: '2026-01-15T12:00:00Z' },
      ],
      error: null,
    });

    const metrics = await getLinkedInMetrics();
    expect(metrics.totalPosts).toBe(3);
    expect(metrics.successfulPosts).toBe(2);
    expect(metrics.failedPosts).toBe(1);
    expect(metrics.successRate).toBeCloseTo(66.67, 1);
  });
});