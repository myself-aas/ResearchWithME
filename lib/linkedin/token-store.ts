import { getSupabasePublicClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/crypto';

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp ms
  scope: string;
}

export class TokenStore {
  private readonly TABLE = 'linkedin_tokens';
  private readonly ROW_ID = 'company_page_tokens';

  async getTokens(): Promise<TokenSet | null> {
    const supabase = getSupabasePublicClient();
    const { data, error } = await supabase
      .from(this.TABLE)
      .select('*')
      .eq('id', this.ROW_ID)
      .single();

    if (error || !data) return null;

    return {
      access_token: await decrypt(data.access_token),
      refresh_token: await decrypt(data.refresh_token),
      expires_at: data.expires_at,
      scope: data.scope,
    };
  }

  async saveTokens(tokens: TokenSet): Promise<void> {
    const supabase = getSupabasePublicClient();
    const { error } = await supabase
      .from(this.TABLE)
      .upsert({
        id: this.ROW_ID,
        access_token: await encrypt(tokens.access_token),
        refresh_token: await encrypt(tokens.refresh_token),
        expires_at: tokens.expires_at,
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) throw new Error(`Failed to save tokens: ${error.message}`);
  }

  async clearTokens(): Promise<void> {
    const supabase = getSupabasePublicClient();
    const { error } = await supabase
      .from(this.TABLE)
      .delete()
      .eq('id', this.ROW_ID);

    if (error) throw new Error(`Failed to clear tokens: ${error.message}`);
  }

  isTokenExpired(tokens: TokenSet): boolean {
    return Date.now() >= tokens.expires_at - 60000; // 1 min buffer
  }
}