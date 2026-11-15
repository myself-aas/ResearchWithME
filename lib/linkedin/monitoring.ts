import { getSupabasePublicClient } from '@/lib/supabase/server';

export type LinkedInEventType = 'post_attempt' | 'token_refresh' | 'oauth_init' | 'oauth_callback' | 'batch_start' | 'batch_complete';

export interface LinkedInEvent {
  type: LinkedInEventType;
  slug?: string;
  status: 'success' | 'failed' | 'pending';
  postUrn?: string;
  error?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface LinkedInMetrics {
  totalPosts: number;
  successfulPosts: number;
  failedPosts: number;
  successRate: number;
  recentEvents: LinkedInEvent[];
  lastPostAt: string | null;
}

const EVENTS_TABLE = 'linkedin_events';

export async function logLinkedInEvent(event: LinkedInEvent): Promise<void> {
  try {
    const supabase = getSupabasePublicClient();
    const { error } = await supabase.from(EVENTS_TABLE).insert({
      type: event.type,
      slug: event.slug,
      status: event.status,
      post_urn: event.postUrn,
      error: event.error,
      details: event.details,
      created_at: event.timestamp,
    });

    if (error) {
      console.error('[LinkedIn Monitoring] Failed to log event:', error);
    }
  } catch (err) {
    console.error('[LinkedIn Monitoring] Unexpected error logging event:', err);
  }
}

export async function getLinkedInMetrics(days: number = 30): Promise<LinkedInMetrics> {
  const supabase = getSupabasePublicClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from(EVENTS_TABLE)
    .select('*')
    .eq('type', 'post_attempt')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) {
    return {
      totalPosts: 0,
      successfulPosts: 0,
      failedPosts: 0,
      successRate: 0,
      recentEvents: [],
      lastPostAt: null,
    };
  }

  const postAttempts = data.filter(e => e.type === 'post_attempt');
  const successful = postAttempts.filter(e => e.status === 'success');
  const failed = postAttempts.filter(e => e.status === 'failed');

  return {
    totalPosts: postAttempts.length,
    successfulPosts: successful.length,
    failedPosts: failed.length,
    successRate: postAttempts.length > 0 ? (successful.length / postAttempts.length) * 100 : 0,
    recentEvents: data as LinkedInEvent[],
    lastPostAt: successful[0]?.created_at || null,
  };
}

// Helper to log from client/automation
export function createEventLogger() {
  return {
    logPostAttempt: (slug: string, status: 'success' | 'failed', postUrn?: string, error?: string) =>
      logLinkedInEvent({
        type: 'post_attempt',
        slug,
        status,
        postUrn,
        error,
        timestamp: new Date().toISOString(),
      }),
    logTokenRefresh: (status: 'success' | 'failed', error?: string) =>
      logLinkedInEvent({
        type: 'token_refresh',
        status,
        error,
        timestamp: new Date().toISOString(),
      }),
    logBatchStart: (count: number) =>
      logLinkedInEvent({
        type: 'batch_start',
        status: 'pending',
        details: { articleCount: count },
        timestamp: new Date().toISOString(),
      }),
    logBatchComplete: (posted: number, failed: number) =>
      logLinkedInEvent({
        type: 'batch_complete',
        status: failed === 0 ? 'success' : 'failed',
        details: { posted, failed },
        timestamp: new Date().toISOString(),
      }),
  };
}