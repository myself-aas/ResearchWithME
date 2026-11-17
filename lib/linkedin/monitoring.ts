import { getSupabasePublicClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export interface LinkedInEvent {
  type: 'post_attempt' | 'token_refresh' | 'webhook_received' | 'batch_run' | 'error';
  slug?: string;
  status: 'started' | 'success' | 'failed' | 'retrying' | 'skipped';
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
  lastPostAt?: string;
  lastError?: string;
}

type RpcClient = {
  rpc: (
    fn: string,
    params?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export interface MonitoringOptions {
  client?: RpcClient;
  bridgeSecret?: string | null;
}

function resolveBridgeSecret(override?: string | null): string | null {
  if (override !== undefined) return override;
  const value = (process.env.LINKEDIN_BRIDGE_SECRET ?? '').trim();
  return value || null;
}

function getRpcClient(options?: MonitoringOptions): RpcClient | null {
  if (options?.client) return options.client;
  if (!isSupabaseConfigured) return null;
  try {
    return getSupabasePublicClient() as unknown as RpcClient;
  } catch {
    return null;
  }
}

export async function logLinkedInEvent(
  event: LinkedInEvent,
  options?: MonitoringOptions,
): Promise<void> {
  const client = getRpcClient(options);
  if (!client) {
    return;
  }

  try {
    const { error } = await client.rpc('linkedin_log_event', {
      p_type: event.type,
      p_slug: event.slug ?? null,
      p_status: event.status,
      p_post_urn: event.postUrn ?? null,
      p_error: event.error ?? null,
      p_details: event.details ?? null,
      p_secret: resolveBridgeSecret(options?.bridgeSecret),
    });

    if (error) {
      console.error('[LinkedIn Monitoring] Failed to log event:', error.message);
    }
  } catch (err) {
    console.error('[LinkedIn Monitoring] Unexpected error logging event:', err);
  }
}

export async function getLinkedInMetrics(
  days = 30,
  options?: MonitoringOptions,
): Promise<LinkedInMetrics> {
  const empty: LinkedInMetrics = {
    totalPosts: 0,
    successfulPosts: 0,
    failedPosts: 0,
    successRate: 0,
  };

  const client = getRpcClient(options);
  if (!client) return empty;

  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await client.rpc('linkedin_get_metrics', {
      p_since: since,
      p_secret: resolveBridgeSecret(options?.bridgeSecret),
    });

    if (error || !Array.isArray(data)) {
      return empty;
    }

    const rows = data as Array<{ type: string; status: string; created_at: string }>;
    const totalPosts = rows.length;
    const successfulPosts = rows.filter((e) => e.status === 'success').length;
    const failedPosts = rows.filter((e) => e.status === 'failed').length;
    const successRate = totalPosts > 0 ? (successfulPosts / totalPosts) * 100 : 0;
    const lastPostAt = rows.find((e) => e.status === 'success')?.created_at;

    return {
      totalPosts,
      successfulPosts,
      failedPosts,
      successRate,
      lastPostAt,
    };
  } catch (err) {
    console.error('[LinkedIn Monitoring] Failed to get metrics:', err);
    return empty;
  }
}

export function createEventLogger(options?: MonitoringOptions) {
  return {
    logPostAttempt: (slug: string, status: 'started' | 'success' | 'failed', postUrn?: string, error?: string) =>
      logLinkedInEvent({
        type: 'post_attempt',
        slug,
        status,
        postUrn,
        error,
        timestamp: new Date().toISOString(),
      }, options),

    logTokenRefresh: (status: 'started' | 'success' | 'failed', error?: string) =>
      logLinkedInEvent({
        type: 'token_refresh',
        status,
        error,
        timestamp: new Date().toISOString(),
      }, options),

    logBatchStart: (count: number) =>
      logLinkedInEvent({
        type: 'batch_run',
        status: 'started',
        details: { articleCount: count },
        timestamp: new Date().toISOString(),
      }, options),

    logBatchComplete: (posted: number, failed: number) =>
      logLinkedInEvent({
        type: 'batch_run',
        status: failed === 0 ? 'success' : 'failed',
        details: { posted, failed },
        timestamp: new Date().toISOString(),
      }, options),
  };
}
