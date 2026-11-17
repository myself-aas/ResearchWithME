import { encrypt, decrypt } from '@/lib/crypto';
import { getSupabasePublicClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in ms
  scope: string;
}

interface StoredTokenRow {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
  updated_at?: string;
}

export type LinkedInRpcClient = {
  rpc: (
    fn: string,
    params?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export interface TokenStoreOptions {
  /** Optional authenticated Supabase client (e.g., Editor-in-Chief request). */
  client?: LinkedInRpcClient;
  /** Optional override for LINKEDIN_BRIDGE_SECRET (used by webhook/cron). */
  bridgeSecret?: string | null;
}

function resolveBridgeSecret(override?: string | null): string | null {
  if (override !== undefined) return override;
  const value = (process.env.LINKEDIN_BRIDGE_SECRET ?? '').trim();
  return value || null;
}

export class TokenStore {
  private readonly clientOverride?: LinkedInRpcClient;
  private readonly bridgeSecretOverride?: string | null;

  constructor(options: TokenStoreOptions = {}) {
    this.clientOverride = options.client;
    this.bridgeSecretOverride = options.bridgeSecret;
  }

  private getClient(): LinkedInRpcClient | null {
    if (this.clientOverride) return this.clientOverride;
    if (!isSupabaseConfigured) return null;
    return getSupabasePublicClient() as unknown as LinkedInRpcClient;
  }

  async getTokens(): Promise<TokenSet | null> {
    const client = this.getClient();
    if (!client) return null;

    const { data, error } = await client.rpc('linkedin_get_tokens', {
      p_secret: resolveBridgeSecret(this.bridgeSecretOverride),
    });

    if (error) return null;

    const row = Array.isArray(data)
      ? (data[0] as StoredTokenRow | undefined)
      : (data as StoredTokenRow | null);

    if (!row) return null;

    return {
      access_token: decrypt(row.access_token),
      refresh_token: decrypt(row.refresh_token),
      expires_at: Number(row.expires_at),
      scope: row.scope,
    };
  }

  async saveTokens(tokens: TokenSet): Promise<void> {
    const client = this.getClient();
    if (!client) {
      throw new Error('Supabase is not configured. Cannot save LinkedIn tokens.');
    }

    const encryptedAccess = encrypt(tokens.access_token);
    const encryptedRefresh = encrypt(tokens.refresh_token);

    const { error } = await client.rpc('linkedin_save_tokens', {
      p_access_token: encryptedAccess,
      p_refresh_token: encryptedRefresh,
      p_expires_at: tokens.expires_at,
      p_scope: tokens.scope,
      p_secret: resolveBridgeSecret(this.bridgeSecretOverride),
    });

    if (error) {
      throw new Error(`Failed to save LinkedIn tokens: ${error.message}`);
    }
  }

  async deleteTokens(): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    const { error } = await client.rpc('linkedin_delete_tokens', {
      p_secret: resolveBridgeSecret(this.bridgeSecretOverride),
    });

    if (error) {
      throw new Error(`Failed to delete LinkedIn tokens: ${error.message}`);
    }
  }

  isTokenExpired(tokens: TokenSet, bufferMs = 5 * 60 * 1000): boolean {
    return Date.now() >= tokens.expires_at - bufferMs;
  }
}
