/**
 * ResearchWithME v3.4 — Live Delivery Providers (Wave 18 P1).
 *
 * Wires real external delivery channels while preserving Part V §12.2–§12.3
 * classification safety and non-suppressible integrity/security guarantees:
 *   1. VAPID Web Push (RFC 8292 ES256 JWT signing via Web Crypto / Node crypto)
 *      targeting active `v34_push_subscriptions` with automatic 404/410 revocation.
 *   2. Resend Notification Digests (`digest@researchwith.me` on verified sending domain)
 *      and mandatory security alerts via existing `createEmailSender`.
 *   3. Supabase Realtime private fan-out broadcast (`private-user:{userId}`) paired
 *      with Migration 12 `supabase_realtime` publication on `v34_notifications` &
 *      `v34_attention_items`.
 */
import crypto from 'node:crypto';
import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SENDING_DOMAIN } from '@/lib/email/scenarios';
import { createEmailSender } from '@/lib/email/send';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config';
import {
  notificationPreview,
  resolveEffectiveNotificationPolicy,
  type NotificationCategory,
} from './notifications-safe';
import { isUuid, runSupabaseMutation } from './supabase-sync';
import type { DataClassification } from './wave6-contracts';

export interface VapidConfig {
  publicKey: string;
  privateKeyPemOrJwk: string;
  subject: string;
}

export interface PushSubscriptionTarget {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  authSecret: string;
  classificationSafePreview: boolean;
}

export interface PushDeliveryResult {
  subscriptionId: string;
  delivered: boolean;
  revoked: boolean;
  skipped?: boolean;
  status?: number;
  previewText: string;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64url');
}

export function getVapidConfig(
  env: Record<string, string | undefined> = process.env,
): VapidConfig | null {
  const publicKey = (env.VAPID_PUBLIC_KEY ?? env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '').trim();
  const privateKeyPemOrJwk = (env.VAPID_PRIVATE_KEY ?? '').trim();
  const subject = (env.VAPID_SUBJECT ?? `mailto:notifications@${SENDING_DOMAIN}`).trim();
  if (!publicKey || !privateKeyPemOrJwk) return null;
  return { publicKey, privateKeyPemOrJwk, subject };
}

/**
 * Signs an RFC 8292 VAPID ES256 JWT (`typ: JWT`, `alg: ES256`) using Node/Workers
 * `node:crypto` KeyObject (supports PEM PKCS8/SEC1 or base64url raw 32-byte JWK `d`
 * combined with uncompressed 65-byte base64url public key).
 */
export function signVapidJwt(
  audienceOrigin: string,
  config: VapidConfig,
  opts: { nowEpochSeconds?: number; ttlSeconds?: number } = {},
): string {
  const now = opts.nowEpochSeconds ?? Math.floor(Date.now() / 1000);
  const ttl = Math.max(60, Math.min(opts.ttlSeconds ?? 12 * 3600, 24 * 3600));

  const header = base64UrlEncode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      aud: audienceOrigin,
      exp: now + ttl,
      sub: config.subject,
    }),
  );
  const signingInput = `${header}.${payload}`;

  let keyObj: crypto.KeyObject;
  if (config.privateKeyPemOrJwk.includes('BEGIN')) {
    keyObj = crypto.createPrivateKey(config.privateKeyPemOrJwk);
  } else if (config.privateKeyPemOrJwk.startsWith('{')) {
    keyObj = crypto.createPrivateKey({
      key: JSON.parse(config.privateKeyPemOrJwk) as crypto.JsonWebKey,
      format: 'jwk',
    });
  } else {
    // Standard Web Push base64url raw 32-byte scalar `d` + 65-byte uncompressed public key
    const pubRaw = Buffer.from(config.publicKey, 'base64url');
    if (pubRaw.length !== 65 || pubRaw[0] !== 0x04) {
      throw new Error('VAPID_PUBLIC_KEY must be a 65-byte uncompressed P-256 base64url key.');
    }
    const x = pubRaw.subarray(1, 33).toString('base64url');
    const y = pubRaw.subarray(33, 65).toString('base64url');
    keyObj = crypto.createPrivateKey({
      key: {
        kty: 'EC',
        crv: 'P-256',
        x,
        y,
        d: config.privateKeyPemOrJwk,
      },
      format: 'jwk',
    });
  }

  const signature = crypto.sign('sha256', Buffer.from(signingInput, 'utf8'), {
    key: keyObj,
    dsaEncoding: 'ieee-p1363',
  });
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

/**
 * Dispatches a classification-safe Web Push notification to a registered
 * `v34_push_subscriptions` endpoint using RFC 8292 VAPID headers.
 * Never sends private/restricted prose in the push preview.
 * Automatically marks HTTP 404/410 subscriptions as revoked in Supabase.
 */
export async function sendWebPushNotification(input: {
  subscription: PushSubscriptionTarget;
  category: NotificationCategory;
  classification: DataClassification;
  publicTitle: string;
  actionHref: string;
  dedupeKey: string;
  userMuted?: boolean;
  inQuietHours?: boolean;
  supabase?: SupabaseClient | null;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}): Promise<PushDeliveryResult> {
  const policy = resolveEffectiveNotificationPolicy({
    category: input.category,
    userMuted: input.userMuted,
    inQuietHours: input.inQuietHours,
  });

  // Always enforce classification-safe preview (Part V §12.2)
  const effectiveClass: DataClassification =
    input.subscription.classificationSafePreview && input.classification !== 'PUBLIC'
      ? input.classification
      : input.classification;
  const previewText = notificationPreview(effectiveClass, {
    publicTitle: input.publicTitle,
  });

  if (!policy.pushEnabled) {
    return {
      subscriptionId: input.subscription.id,
      delivered: false,
      revoked: false,
      skipped: true,
      previewText,
    };
  }

  const vapid = getVapidConfig(input.env);
  if (!vapid) {
    return {
      subscriptionId: input.subscription.id,
      delivered: false,
      revoked: false,
      skipped: true,
      previewText,
    };
  }

  const endpointUrl = new URL(input.subscription.endpoint);
  if (endpointUrl.protocol !== 'https:') {
    throw new Error('Push subscription endpoint must use HTTPS.');
  }

  const jwt = signVapidJwt(endpointUrl.origin, vapid);
  const doFetch = input.fetchImpl ?? fetch;

  // Send VAPID-authorized tickle/push request; full payload details are fetched
  // authenticated over HTTPS once the user opens the notification so restricted
  // research prose never traverses third-party push relays.
  const res = await doFetch(input.subscription.endpoint, {
    method: 'POST',
    headers: {
      TTL: '3600',
      Urgency: input.category === 'integrity_alert' || input.category === 'security_alert' ? 'high' : 'normal',
      Topic: input.dedupeKey.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'rwm-update',
      Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
      'Content-Length': '0',
    },
  });

  if (res.status === 404 || res.status === 410) {
    if (input.supabase && isUuid(input.subscription.userId)) {
      await runSupabaseMutation(input.supabase, (sb) =>
        sb
          .from('v34_push_subscriptions')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', input.subscription.id)
          .eq('user_id', input.subscription.userId),
      );
    }
    return {
      subscriptionId: input.subscription.id,
      delivered: false,
      revoked: true,
      status: res.status,
      previewText,
    };
  }

  return {
    subscriptionId: input.subscription.id,
    delivered: res.ok,
    revoked: false,
    status: res.status,
    previewText,
  };
}

export interface DigestNotificationItem {
  id: string;
  category: NotificationCategory;
  classification: DataClassification;
  publicTitle: string;
  actionHref: string;
  createdAt: string;
}

export interface DigestSendResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  id?: string;
  includedCount: number;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Dispatches a classification-safe ResearchWithME notification digest via Resend
 * (verified sending domain `researchwith.me`), respecting quiet hours and never
 * leaking non-public research titles or excerpts into email bodies.
 */
export async function sendNotificationDigestEmail(input: {
  userId: string;
  recipientEmail: string;
  digestDate: string;
  items: DigestNotificationItem[];
  inQuietHours?: boolean;
  digestOff?: boolean;
  env?: Record<string, string | undefined>;
  resendClient?: Pick<Resend, 'emails'>;
}): Promise<DigestSendResult> {
  const deliverable = input.items.filter((item) => {
    const policy = resolveEffectiveNotificationPolicy({
      category: item.category,
      inQuietHours: input.inQuietHours,
      digestOff: input.digestOff,
    });
    return policy.inAppEnabled && (!input.digestOff || !policy.suppressible);
  });

  if (deliverable.length === 0) {
    return { ok: true, skipped: true, reason: 'no_deliverable_items', includedCount: 0 };
  }

  const env = input.env ?? process.env;
  const apiKey = (env.RESEND_API_KEY ?? '').trim();
  if (!apiKey && !input.resendClient) {
    return {
      ok: false,
      skipped: true,
      reason: 'RESEND_API_KEY not configured',
      includedCount: deliverable.length,
    };
  }

  const siteUrl = (env.NEXT_PUBLIC_SITE_URL ?? 'https://researchwith.me').replace(/\/$/, '');
  const safeLines = deliverable.map((item) => ({
    title: notificationPreview(item.classification, { publicTitle: item.publicTitle }),
    href: item.actionHref.startsWith('http') ? item.actionHref : `${siteUrl}${item.actionHref}`,
    category: item.category,
  }));

  const hasMandatoryAlert = deliverable.some(
    (item) => item.category === 'integrity_alert' || item.category === 'security_alert',
  );

  // If the digest contains a single mandatory security alert, also allow the
  // existing verified transactional security-alert scenario when requested.
  if (
    !input.resendClient &&
    deliverable.length === 1 &&
    deliverable[0].category === 'security_alert' &&
    env.RWM_USE_SECURITY_SCENARIO === 'true'
  ) {
    const sender = createEmailSender(env);
    const res = await sender.sendScenario('security-alert', {
      to: input.recipientEmail,
      entityId: `${input.userId}-${input.digestDate}`,
      variables: {
        name: 'Researcher',
        event: safeLines[0].title,
        occurredAt: input.digestDate,
        location: 'ResearchWithME',
        securityUrl: `${siteUrl}/settings`,
      },
    });
    return {
      ok: res.ok,
      skipped: !res.ok && res.skipped,
      id: res.ok ? res.id : undefined,
      reason: res.ok ? undefined : res.skipped ? res.reason : res.error,
      includedCount: 1,
    };
  }

  const subject = hasMandatoryAlert
    ? `[ResearchWithME] Integrity & research attention update (${deliverable.length})`
    : `ResearchWithME digest — ${deliverable.length} research update${deliverable.length === 1 ? '' : 's'} (${input.digestDate})`;

  const html = [
    '<div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">',
    '<h1 style="font-size:18px;margin:0 0 12px;">ResearchWithME Attention &amp; Activity Digest</h1>',
    '<p style="font-size:14px;color:#475569;margin:0 0 16px;">Protected workspace titles are masked automatically in email previews.</p>',
    '<ul style="padding-left:18px;margin:0 0 20px;">',
    ...safeLines.map(
      (line) =>
        `<li style="margin-bottom:10px;"><a href="${escapeHtml(line.href)}" style="color:#0f4c81;text-decoration:none;font-weight:600;">${escapeHtml(line.title)}</a> <span style="font-size:12px;color:#64748b;">(${escapeHtml(line.category)})</span></li>`,
    ),
    '</ul>',
    `<p style="font-size:12px;color:#64748b;">Manage notification channels and quiet hours in <a href="${escapeHtml(siteUrl)}/settings">Settings</a>.</p>`,
    '</div>',
  ].join('');

  const text = [
    'ResearchWithME Attention & Activity Digest',
    '',
    ...safeLines.map((line) => `- ${line.title} (${line.category}): ${line.href}`),
    '',
    `Manage preferences: ${siteUrl}/settings`,
  ].join('\n');

  const client = input.resendClient ?? new Resend(apiKey);
  const { data, error } = await client.emails.send(
    {
      from: `ResearchWithME Digest <digest@${SENDING_DOMAIN}>`,
      replyTo: `notifications@${SENDING_DOMAIN}`,
      to: input.recipientEmail,
      subject,
      html,
      text,
      tags: [
        { name: 'scenario', value: 'research-digest' },
        { name: 'category', value: hasMandatoryAlert ? 'integrity_alert' : 'topic_digest' },
      ],
    },
    {
      idempotencyKey: `research-digest/${input.userId}/${input.digestDate}`,
    },
  );

  if (error) {
    return { ok: false, reason: error.message, includedCount: deliverable.length };
  }
  return { ok: true, id: data?.id, includedCount: deliverable.length };
}

/**
 * Fans out a classification-safe private Realtime broadcast event via the
 * Supabase Realtime REST API (`private-user:{userId}`), complementing live
 * `postgres_changes` subscriptions on `v34_notifications` & `v34_attention_items`.
 */
export async function publishRealtimePrivateEvent(input: {
  userId: string;
  event: 'notification.created' | 'attention.updated' | 'integrity.alert';
  classification: DataClassification;
  objectType: string;
  objectId: string;
  publicTitle: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}): Promise<{ broadcast: boolean; skipped?: boolean; topic: string; status?: number }> {
  const topic = `private-user:${input.userId}`;
  const env = input.env ?? process.env;
  const baseUrl = (env.NEXT_PUBLIC_SUPABASE_URL ?? SUPABASE_URL).trim().replace(/\/$/, '');
  const apiKey = (
    env.SUPABASE_SERVICE_ROLE_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    SUPABASE_ANON_KEY
  ).trim();

  if (!baseUrl || !apiKey || baseUrl.includes('127.0.0.1:9')) {
    return { broadcast: false, skipped: true, topic };
  }

  const doFetch = input.fetchImpl ?? fetch;
  try {
    const res = await doFetch(`${baseUrl}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic,
            event: input.event,
            private: true,
            payload: {
              objectType: input.objectType,
              objectId: input.objectId,
              preview: notificationPreview(input.classification, {
                publicTitle: input.publicTitle,
              }),
              emittedAt: new Date().toISOString(),
            },
          },
        ],
      }),
    });
    return { broadcast: res.ok, topic, status: res.status };
  } catch {
    return { broadcast: false, topic };
  }
}
