-- LinkedIn OAuth tokens storage
CREATE TABLE IF NOT EXISTS linkedin_tokens (
  id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE linkedin_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage LinkedIn tokens"
  ON linkedin_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add linkedin_post_status to articles table if using CMS
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS linkedin_post_status TEXT DEFAULT 'pending';
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS linkedin_post_urn TEXT;
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS linkedin_posted_at TIMESTAMPTZ;