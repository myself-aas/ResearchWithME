import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isUuid, runSupabaseMutation } from './supabase-sync';
import {
  listContributions,
  listLibraryItems,
  listResearchGoals,
  listUserDrafts,
} from './store';
import {
  getDashboardPreferences,
  getRecognitionSummary,
  listAttentionItems,
  listNotifications,
} from './wave3-store';
import {
  DASHBOARD_MODULE_KEYS,
  type DashboardModuleKey,
  type SyncResourceType,
} from './wave7-contracts';

export interface UserDeviceRecord {
  id: string;
  userId: string;
  label: string;
  platform: 'web' | 'ios' | 'android' | 'desktop' | 'pwa';
  userAgent: string | null;
  lastSeenAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  deviceId: string | null;
  endpoint: string;
  p256dh: string;
  authSecret: string;
  classificationSafePreview: boolean;
  createdAt: string;
  revokedAt: string | null;
}

export interface UserAffiliationRecord {
  id: string;
  institution: string;
  roleTitle: string;
  rorId: string | null;
  startYear: number | null;
  endYear: number | null;
  isPrimary: boolean;
}

export interface UserExpertiseRecord {
  id: string;
  topicSlug: string | null;
  label: string;
  evidenceNote: string | null;
}

export interface ContributorProfileRecord {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  orcidId: string | null;
  githubHandle: string | null;
  affiliations: UserAffiliationRecord[];
  expertise: UserExpertiseRecord[];
  updatedAt: string;
}

export interface DashboardModuleConfig {
  moduleKey: DashboardModuleKey;
  pinned: boolean;
  collapsed: boolean;
  hidden: boolean;
  order: number;
  updatedAt: string;
}

interface Wave7State {
  devices: Map<string, UserDeviceRecord[]>;
  pushSubscriptions: Map<string, PushSubscriptionRecord[]>;
  profilesByUserId: Map<string, ContributorProfileRecord>;
  dashboardModules: Map<string, DashboardModuleConfig[]>;
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

function defaultModules(): DashboardModuleConfig[] {
  const now = '2026-11-16T00:00:00.000Z';
  return DASHBOARD_MODULE_KEYS.map((key, idx) => ({
    moduleKey: key,
    pinned: key === 'attention-queue' || key === 'continue-working',
    collapsed: false,
    hidden: false,
    order: idx,
    updatedAt: now,
  }));
}

function seedWave7State(): Wave7State {
  const now = '2026-11-16T09:00:00.000Z';
  const profilesByUserId = new Map<string, ContributorProfileRecord>();
  const defaultProfile: ContributorProfileRecord = {
    userId: 'local-contributor',
    username: 'myself-aas',
    displayName: 'ResearchWithME Editorial Fellow',
    bio: 'Open-science researcher focusing on verifiable LLM reasoning, inference systems, and evidence-grounded technical peer review.',
    orcidId: '0000-0002-1825-0097',
    githubHandle: 'myself-aas',
    affiliations: [
      {
        id: 'aff-rwm-01',
        institution: 'ResearchWithME Open Knowledge Lab',
        roleTitle: 'Lead Methodological Reviewer',
        rorId: null,
        startYear: 2024,
        endYear: null,
        isPrimary: true,
      },
    ],
    expertise: [
      {
        id: 'exp-reasoning-01',
        topicSlug: 'reasoning-models',
        label: 'Reasoning Models & RL Post-Training',
        evidenceNote: 'Verified replication audits on GRPO & cold-start reasoning pipelines.',
      },
      {
        id: 'exp-inference-02',
        topicSlug: 'inference-systems',
        label: 'KV-Cache & High-Throughput Inference Systems',
        evidenceNote: 'Source-linked benchmarks for PagedAttention and speculative decoding.',
      },
    ],
    updatedAt: now,
  };
  profilesByUserId.set('local-contributor', defaultProfile);
  profilesByUserId.set('default', { ...defaultProfile, userId: 'default' });

  const devices = new Map<string, UserDeviceRecord[]>();
  devices.set('local-contributor', [
    {
      id: 'dev-primary-web',
      userId: 'local-contributor',
      label: 'Primary Research Workstation (Web)',
      platform: 'web',
      userAgent: 'ResearchWithME-PWA/3.4',
      lastSeenAt: now,
      revokedAt: null,
      createdAt: now,
    },
  ]);

  return {
    devices,
    pushSubscriptions: new Map(),
    profilesByUserId,
    dashboardModules: new Map(),
  };
}

const g7 = globalThis as unknown as { __rwmV34Wave7State?: Wave7State };
const w7State: Wave7State = g7.__rwmV34Wave7State ?? seedWave7State();
g7.__rwmV34Wave7State = w7State;

export function resetWave7StoreForTesting(): void {
  const fresh = seedWave7State();
  w7State.devices = fresh.devices;
  w7State.pushSubscriptions = fresh.pushSubscriptions;
  w7State.profilesByUserId = fresh.profilesByUserId;
  w7State.dashboardModules = fresh.dashboardModules;
}

// ── Devices & Remote Wipe (Part V §6.12, §15.3) ────────────────────────────

export function listUserDevices(userId: string): UserDeviceRecord[] {
  return [...(w7State.devices.get(userId) ?? [])]
    .filter((d) => !d.revokedAt)
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export async function registerUserDevice(input: {
  userId: string;
  label: string;
  platform: 'web' | 'ios' | 'android' | 'desktop' | 'pwa';
  userAgent?: string;
  supabase?: SupabaseClient | null;
}): Promise<UserDeviceRecord> {
  const now = new Date().toISOString();
  const record: UserDeviceRecord = {
    id: makeId('dev'),
    userId: input.userId,
    label: input.label,
    platform: input.platform,
    userAgent: input.userAgent ?? null,
    lastSeenAt: now,
    revokedAt: null,
    createdAt: now,
  };
  const existing = w7State.devices.get(input.userId) ?? [];
  existing.unshift(record);
  w7State.devices.set(input.userId, existing);

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_user_devices').insert({
        id: record.id,
        user_id: record.userId,
        label: record.label,
        platform: record.platform,
        user_agent: record.userAgent,
        last_seen_at: record.lastSeenAt,
      }),
    );
  }
  return record;
}

export async function revokeUserDevice(input: {
  userId: string;
  deviceId: string;
  supabase?: SupabaseClient | null;
}): Promise<{ ok: true; device: UserDeviceRecord; revokedSubscriptions: number } | { ok: false; status: 404; message: string }> {
  const list = w7State.devices.get(input.userId) ?? [];
  const idx = list.findIndex((d) => d.id === input.deviceId && !d.revokedAt);
  if (idx < 0) return { ok: false, status: 404, message: 'Registered device not found.' };

  const now = new Date().toISOString();
  const updated: UserDeviceRecord = { ...list[idx], revokedAt: now };
  list[idx] = updated;
  w7State.devices.set(input.userId, list);

  // Also revoke push subscriptions bound to this device (Part V §15.3)
  const subs = w7State.pushSubscriptions.get(input.userId) ?? [];
  let revokedSubscriptions = 0;
  for (let i = 0; i < subs.length; i += 1) {
    if (subs[i].deviceId === input.deviceId && !subs[i].revokedAt) {
      subs[i] = { ...subs[i], revokedAt: now };
      revokedSubscriptions += 1;
    }
  }
  w7State.pushSubscriptions.set(input.userId, subs);

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_user_devices').update({ revoked_at: now }).eq('id', input.deviceId).eq('user_id', input.userId),
    );
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_push_subscriptions').update({ revoked_at: now }).eq('device_id', input.deviceId).eq('user_id', input.userId),
    );
  }
  return { ok: true, device: updated, revokedSubscriptions };
}

// ── Push Subscriptions (Part V §6.12, §12.2) ───────────────────────────────

export function listPushSubscriptions(userId: string): PushSubscriptionRecord[] {
  return [...(w7State.pushSubscriptions.get(userId) ?? [])].filter((s) => !s.revokedAt);
}

export async function registerPushSubscription(input: {
  userId: string;
  deviceId?: string | null;
  endpoint: string;
  p256dh: string;
  authSecret: string;
  classificationSafePreview: boolean;
  supabase?: SupabaseClient | null;
}): Promise<PushSubscriptionRecord> {
  const now = new Date().toISOString();
  const list = w7State.pushSubscriptions.get(input.userId) ?? [];
  const existingIdx = list.findIndex((s) => s.endpoint === input.endpoint && !s.revokedAt);
  const record: PushSubscriptionRecord = {
    id: existingIdx >= 0 ? list[existingIdx].id : makeId('push'),
    userId: input.userId,
    deviceId: input.deviceId ?? null,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    authSecret: input.authSecret,
    classificationSafePreview: input.classificationSafePreview,
    createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : now,
    revokedAt: null,
  };
  if (existingIdx >= 0) {
    list[existingIdx] = record;
  } else {
    list.unshift(record);
  }
  w7State.pushSubscriptions.set(input.userId, list);

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_push_subscriptions').upsert({
        id: record.id,
        user_id: record.userId,
        device_id: record.deviceId,
        endpoint: record.endpoint,
        p256dh: record.p256dh,
        auth_secret: record.authSecret,
        classification_safe_preview: record.classificationSafePreview,
        revoked_at: null,
      }),
    );
  }
  return record;
}

export async function revokePushSubscription(input: {
  userId: string;
  subscriptionId: string;
  supabase?: SupabaseClient | null;
}): Promise<boolean> {
  const list = w7State.pushSubscriptions.get(input.userId) ?? [];
  const idx = list.findIndex((s) => s.id === input.subscriptionId && !s.revokedAt);
  if (idx < 0) return false;
  const now = new Date().toISOString();
  list[idx] = { ...list[idx], revokedAt: now };
  w7State.pushSubscriptions.set(input.userId, list);

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_push_subscriptions').update({ revoked_at: now }).eq('id', input.subscriptionId).eq('user_id', input.userId),
    );
  }
  return true;
}

// ── Contributor Profile, Affiliations, Expertise & Portable Export ─────────

export function getContributorProfile(
  userId: string,
  fallback?: { username: string; displayName: string },
): ContributorProfileRecord {
  const existing = w7State.profilesByUserId.get(userId);
  if (existing) return existing;
  const template = w7State.profilesByUserId.get('default')!;
  const created: ContributorProfileRecord = {
    ...template,
    userId,
    username: fallback?.username ?? userId,
    displayName: fallback?.displayName ?? template.displayName,
  };
  w7State.profilesByUserId.set(userId, created);
  return created;
}

export function getPublicProfileByUsername(username: string): ContributorProfileRecord | null {
  const norm = username.trim().toLowerCase();
  for (const profile of w7State.profilesByUserId.values()) {
    if (profile.username.toLowerCase() === norm || profile.userId.toLowerCase() === norm) {
      return profile;
    }
  }
  return null;
}

export async function updateContributorProfile(input: {
  userId: string;
  username: string;
  displayName?: string;
  bio?: string;
  orcidId?: string | null;
  githubHandle?: string | null;
  affiliations?: Array<{
    id?: string;
    institution: string;
    roleTitle: string;
    rorId?: string | null;
    startYear?: number | null;
    endYear?: number | null;
    isPrimary?: boolean;
  }>;
  expertise?: Array<{
    topicSlug?: string | null;
    label: string;
    evidenceNote?: string | null;
  }>;
  supabase?: SupabaseClient | null;
}): Promise<ContributorProfileRecord> {
  const current = getContributorProfile(input.userId, {
    username: input.username,
    displayName: input.displayName ?? input.username,
  });
  const now = new Date().toISOString();
  const nextAffiliations: UserAffiliationRecord[] = input.affiliations
    ? input.affiliations.map((a) => ({
        id: a.id ?? makeId('aff'),
        institution: a.institution,
        roleTitle: a.roleTitle,
        rorId: a.rorId ?? null,
        startYear: a.startYear ?? null,
        endYear: a.endYear ?? null,
        isPrimary: Boolean(a.isPrimary),
      }))
    : current.affiliations;

  const nextExpertise: UserExpertiseRecord[] = input.expertise
    ? input.expertise.map((e) => ({
        id: makeId('exp'),
        topicSlug: e.topicSlug ?? null,
        label: e.label,
        evidenceNote: e.evidenceNote ?? null,
      }))
    : current.expertise;

  const updated: ContributorProfileRecord = {
    ...current,
    displayName: input.displayName ?? current.displayName,
    bio: input.bio ?? current.bio,
    orcidId: input.orcidId !== undefined ? input.orcidId : current.orcidId,
    githubHandle: input.githubHandle !== undefined ? input.githubHandle : current.githubHandle,
    affiliations: nextAffiliations,
    expertise: nextExpertise,
    updatedAt: now,
  };
  w7State.profilesByUserId.set(input.userId, updated);

  if (input.supabase && isUuid(input.userId)) {
    if (input.affiliations) {
      await runSupabaseMutation(input.supabase, (sb) =>
        sb.from('v34_user_affiliations').delete().eq('user_id', input.userId),
      );
      for (const aff of nextAffiliations) {
        await runSupabaseMutation(input.supabase, (sb) =>
          sb.from('v34_user_affiliations').insert({
            id: aff.id,
            user_id: input.userId,
            institution: aff.institution,
            role_title: aff.roleTitle,
            ror_id: aff.rorId,
            start_year: aff.startYear,
            end_year: aff.endYear,
            is_primary: aff.isPrimary,
          }),
        );
      }
    }
    if (input.expertise) {
      await runSupabaseMutation(input.supabase, (sb) =>
        sb.from('v34_user_expertise').delete().eq('user_id', input.userId),
      );
      for (const exp of nextExpertise) {
        await runSupabaseMutation(input.supabase, (sb) =>
          sb.from('v34_user_expertise').insert({
            id: exp.id,
            user_id: input.userId,
            topic_slug: exp.topicSlug,
            label: exp.label,
            evidence_note: exp.evidenceNote,
          }),
        );
      }
    }
  }
  return updated;
}

export function buildPortableUserExport(userId: string, handle: string, displayName: string): {
  exportedAt: string;
  schemaVersion: 'v3.4';
  checksumSha256: string;
  bundle: Record<string, unknown>;
} {
  const exportedAt = new Date().toISOString();
  const bundle = {
    profile: getContributorProfile(userId, { username: handle, displayName }),
    preferences: getDashboardPreferences(userId),
    dashboardModules: getDashboardModules(userId),
    drafts: listUserDrafts(userId),
    contributions: listContributions().filter((c) => c.authorId === userId || c.authorHandle === handle),
    libraryItems: listLibraryItems(userId),
    researchGoals: listResearchGoals(userId),
    notifications: listNotifications(userId),
    attentionQueue: listAttentionItems(userId),
    recognition: getRecognitionSummary(userId),
    devices: listUserDevices(userId),
  };
  const serialized = JSON.stringify(bundle);
  const checksumSha256 = crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
  return { exportedAt, schemaVersion: 'v3.4', checksumSha256, bundle };
}

// ── Dashboard Module Layout (Part V §6.3, Part I §26.5) ────────────────────

export function getDashboardModules(userId: string): DashboardModuleConfig[] {
  if (!w7State.dashboardModules.has(userId)) {
    w7State.dashboardModules.set(userId, defaultModules());
  }
  return [...w7State.dashboardModules.get(userId)!].sort((a, b) => a.order - b.order);
}

export function updateDashboardModule(input: {
  userId: string;
  moduleKey: DashboardModuleKey;
  pinned?: boolean;
  collapsed?: boolean;
  hidden?: boolean;
  order?: number;
}): DashboardModuleConfig {
  const list = getDashboardModules(input.userId);
  const now = new Date().toISOString();
  const idx = list.findIndex((m) => m.moduleKey === input.moduleKey);
  const current = idx >= 0 ? list[idx] : {
    moduleKey: input.moduleKey,
    pinned: false,
    collapsed: false,
    hidden: false,
    order: list.length,
    updatedAt: now,
  };
  const updated: DashboardModuleConfig = {
    ...current,
    pinned: input.pinned !== undefined ? input.pinned : current.pinned,
    collapsed: input.collapsed !== undefined ? input.collapsed : current.collapsed,
    hidden: input.hidden !== undefined ? input.hidden : current.hidden,
    order: input.order !== undefined ? input.order : current.order,
    updatedAt: now,
  };
  if (idx >= 0) {
    list[idx] = updated;
  } else {
    list.push(updated);
  }
  w7State.dashboardModules.set(input.userId, list);
  return updated;
}

// ── Mobile / PWA Incremental Delta Sync (Part V §6.12) ─────────────────────

export function getSyncDelta(input: {
  userId: string;
  resourceType: SyncResourceType;
  cursor?: string | null;
}): {
  resourceType: SyncResourceType;
  since: string | null;
  nextCursor: string;
  items: unknown[];
  count: number;
} {
  const since = input.cursor && !Number.isNaN(Date.parse(input.cursor)) ? input.cursor : null;
  const after = (iso: string) => (!since ? true : iso > since);

  let items: unknown[] = [];
  switch (input.resourceType) {
    case 'drafts':
      items = listUserDrafts(input.userId).filter((d) => after(d.updatedAt));
      break;
    case 'library':
      items = listLibraryItems(input.userId).filter((i) => after(i.createdAt));
      break;
    case 'notifications':
      items = listNotifications(input.userId).filter((n) => after(n.createdAt));
      break;
    case 'attention':
      items = listAttentionItems(input.userId).filter((a) => after(a.updatedAt));
      break;
    case 'goals':
      items = listResearchGoals(input.userId).filter((g) => after(g.updatedAt));
      break;
    case 'contributions':
      items = listContributions().filter((c) => after(c.updatedAt));
      break;
  }

  return {
    resourceType: input.resourceType,
    since,
    nextCursor: new Date().toISOString(),
    items,
    count: items.length,
  };
}
