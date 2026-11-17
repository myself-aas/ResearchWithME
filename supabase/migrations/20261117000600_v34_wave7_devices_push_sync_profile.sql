-- =============================================================================
-- ResearchWithME v3.4 — Wave 7 Migration
-- Devices, Push Subscriptions, User Affiliations & Expertise, Workspace Access
-- Requests (Part V §6.1, §6.2, §6.12, §12.2, §15.3)
-- =============================================================================

-- 1. Registered user devices (PWA/mobile session inventory & remote wipe)
CREATE TABLE IF NOT EXISTS public.v34_user_devices (
  id                TEXT PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  platform          TEXT NOT NULL CHECK (platform IN ('web', 'ios', 'android', 'desktop', 'pwa')),
  user_agent        TEXT,
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_user_devices_user
  ON public.v34_user_devices (user_id, revoked_at);

ALTER TABLE public.v34_user_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v34_user_devices_owner_all ON public.v34_user_devices;
CREATE POLICY v34_user_devices_owner_all
  ON public.v34_user_devices
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Web Push subscriptions (classification-safe lock-screen preview by default)
CREATE TABLE IF NOT EXISTS public.v34_push_subscriptions (
  id                          TEXT PRIMARY KEY,
  user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id                   TEXT REFERENCES public.v34_user_devices(id) ON DELETE SET NULL,
  endpoint                    TEXT NOT NULL,
  p256dh                      TEXT NOT NULL,
  auth_secret                 TEXT NOT NULL,
  classification_safe_preview BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at                  TIMESTAMPTZ,
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_v34_push_subscriptions_user
  ON public.v34_push_subscriptions (user_id, revoked_at);

ALTER TABLE public.v34_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v34_push_subscriptions_owner_all ON public.v34_push_subscriptions;
CREATE POLICY v34_push_subscriptions_owner_all
  ON public.v34_push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Contributor institutional affiliations (Part V §6.1)
CREATE TABLE IF NOT EXISTS public.v34_user_affiliations (
  id               TEXT PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution      TEXT NOT NULL,
  role_title       TEXT NOT NULL,
  ror_id           TEXT,
  start_year       INTEGER,
  end_year         INTEGER,
  is_primary       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_user_affiliations_user
  ON public.v34_user_affiliations (user_id);

ALTER TABLE public.v34_user_affiliations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v34_user_affiliations_public_read ON public.v34_user_affiliations;
CREATE POLICY v34_user_affiliations_public_read
  ON public.v34_user_affiliations
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS v34_user_affiliations_owner_write ON public.v34_user_affiliations;
CREATE POLICY v34_user_affiliations_owner_write
  ON public.v34_user_affiliations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Contributor verified expertise areas (Part V §6.1)
CREATE TABLE IF NOT EXISTS public.v34_user_expertise (
  id               TEXT PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_slug       TEXT,
  label            TEXT NOT NULL,
  evidence_note    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, label)
);

CREATE INDEX IF NOT EXISTS idx_v34_user_expertise_user
  ON public.v34_user_expertise (user_id);

ALTER TABLE public.v34_user_expertise ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v34_user_expertise_public_read ON public.v34_user_expertise;
CREATE POLICY v34_user_expertise_public_read
  ON public.v34_user_expertise
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS v34_user_expertise_owner_write ON public.v34_user_expertise;
CREATE POLICY v34_user_expertise_owner_write
  ON public.v34_user_expertise
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Private workspace access requests (Part V §6.2)
CREATE TABLE IF NOT EXISTS public.v34_workspace_access_requests (
  id               TEXT PRIMARY KEY,
  workspace_id     TEXT NOT NULL REFERENCES public.v34_workspaces(id) ON DELETE CASCADE,
  requester_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role   TEXT NOT NULL DEFAULT 'MEMBER',
  rationale        TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_ws_access_req_workspace
  ON public.v34_workspace_access_requests (workspace_id, status);

ALTER TABLE public.v34_workspace_access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v34_ws_access_req_member_or_self ON public.v34_workspace_access_requests;
CREATE POLICY v34_ws_access_req_member_or_self
  ON public.v34_workspace_access_requests
  FOR SELECT
  USING (
    auth.uid() = requester_id
    OR EXISTS (
      SELECT 1 FROM public.v34_workspace_members m
      WHERE m.workspace_id = v34_workspace_access_requests.workspace_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS v34_ws_access_req_self_insert ON public.v34_workspace_access_requests;
CREATE POLICY v34_ws_access_req_self_insert
  ON public.v34_workspace_access_requests
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS v34_ws_access_req_admin_update ON public.v34_workspace_access_requests;
CREATE POLICY v34_ws_access_req_admin_update
  ON public.v34_workspace_access_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.v34_workspace_members m
      WHERE m.workspace_id = v34_workspace_access_requests.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );
