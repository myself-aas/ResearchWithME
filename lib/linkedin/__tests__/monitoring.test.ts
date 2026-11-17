import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabasePublicClient: () => mockSupabase,
}));

vi.mock('@/lib/supabase/config', () => ({
  isSupabaseConfigured: true,
}));

import { logLinkedInEvent, getLinkedInMetrics } from '@/lib/linkedin/monitoring';

describe('LinkedIn Monitoring (Bridge RPC)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LINKEDIN_BRIDGE_SECRET = 'bridge-test-secret';
  });

  it('logs post attempt event via linkedin_log_event RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

    await logLinkedInEvent({
      type: 'post_attempt',
      slug: 'test-editorial',
      status: 'success',
      postUrn: 'urn:li:share:123',
      timestamp: new Date().toISOString(),
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'linkedin_log_event',
      expect.objectContaining({
        p_type: 'post_attempt',
        p_slug: 'test-editorial',
        p_status: 'success',
        p_post_urn: 'urn:li:share:123',
        p_secret: 'bridge-test-secret',
      }),
    );
  });

  it('logs post failure with error details', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

    await logLinkedInEvent({
      type: 'post_attempt',
      slug: 'test-editorial',
      status: 'failed',
      error: 'Rate limited',
      timestamp: new Date().toISOString(),
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'linkedin_log_event',
      expect.objectContaining({
        p_status: 'failed',
        p_error: 'Rate limited',
      }),
    );
  });

  it('retrieves metrics via linkedin_get_metrics RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [
        { type: 'post_attempt', status: 'success', created_at: '2026-01-15T10:00:00Z' },
        { type: 'post_attempt', status: 'success', created_at: '2026-01-15T11:00:00Z' },
        { type: 'post_attempt', status: 'failed', created_at: '2026-01-15T12:00:00Z' },
      ],
      error: null,
    });

    const metrics = await getLinkedInMetrics();
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'linkedin_get_metrics',
      expect.objectContaining({
        p_secret: 'bridge-test-secret',
      }),
    );
    expect(metrics.totalPosts).toBe(3);
    expect(metrics.successfulPosts).toBe(2);
    expect(metrics.failedPosts).toBe(1);
    expect(metrics.successRate).toBeCloseTo(66.67, 1);
  });
});
