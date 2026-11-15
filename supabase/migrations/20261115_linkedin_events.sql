-- LinkedIn Events table for monitoring
CREATE TABLE IF NOT EXISTS linkedin_events (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  slug TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  post_urn TEXT,
  error TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_linkedin_events_type_created ON linkedin_events(type, created_at DESC);
CREATE INDEX idx_linkedin_events_slug ON linkedin_events(slug);

ALTER TABLE linkedin_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage LinkedIn events"
  ON linkedin_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view LinkedIn events"
  ON linkedin_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );